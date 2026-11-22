import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CancellationReasonsService } from '@/modules/cancellation-reason/services/cancellation-reasons.service';
import {
  AdminEventDetail,
  AdminEventListItem,
  AdminUserEvents,
  CancelEventData,
  canSeeEvent,
  CreateEventData,
  Event,
  EventChangeViolation,
  eventChangeViolations,
  EventAttendee,
  EventDetail,
  EventFacts,
  EventFilter,
  EventListFilter,
  eventListFilterViolations,
  EventListItem,
  EventListPage,
  EventModeration,
  EventModerationViolation,
  eventModerationViolations,
  EventRuleViolation,
  eventRuleViolations,
  EventSeatFacts,
  externalSpotsViolations,
  GROUP_EVENTS_PAGE_SIZE,
  GroupEventPage,
  GroupEventsPeriod,
  isOrganizerOf,
  LandingCity,
  LandingEventSelection,
  moderationConcernsPeople,
  Page,
  ParticipantEventInfo,
  UpdateEventData,
  ViewerEventState,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { GroupsService } from '@/modules/group/services/groups.service';
import { eventChangesOf } from '@/modules/notification/domain/notification';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import {
  AdminListQuery,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { Identity } from '@/shared/auth/domain/identity';
import { emailNotVerifiedException } from '@/shared/auth/errors/email-not-verified.exception';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const VIOLATION_MESSAGES: Record<EventRuleViolation, string> = {
  START_NOT_IN_FUTURE: 'startAt must be in the future',
  END_NOT_AFTER_START: 'endAt must be after startAt',
  MIN_ABOVE_MAX: 'minParticipants must not exceed maxParticipants',
  OCCUPIED_ABOVE_MAX: 'externalOccupiedSpots must not exceed maxParticipants',
  NOTE_WITHOUT_AMOUNT: 'contributionNote requires contributionAmount',
  POSITION_INCOMPLETE:
    'location.latitude and location.longitude must be sent together',
};

const CHANGE_VIOLATION_MESSAGES: Record<EventChangeViolation, string> = {
  EVENT_HIDDEN: 'An event hidden by an administrator cannot be edited',
  EVENT_NOT_CHANGEABLE: 'The event has started or can no longer be edited',
  EVENT_NOT_CANCELLABLE: 'Only an event that has not started can be cancelled',
  MAX_BELOW_OCCUPIED: 'maxParticipants must not be below the occupied seats',
  VENUE_KIND_CHANGED: 'An online event cannot become a place, or the reverse',
  LOCATION_REQUIRED: 'location is required for an event at a place',
  LOCATION_NOT_ALLOWED: 'an online event has no location',
};

const MODERATION_VIOLATION_MESSAGES: Record<EventModerationViolation, string> =
  {
    EVENT_IS_DRAFT: 'A draft is not public and cannot be hidden',
    EVENT_ALREADY_HIDDEN: 'The event is already hidden',
    EVENT_NOT_HIDDEN: 'The event is not hidden',
  };

const moderationViolationsError = (
  violations: EventModerationViolation[],
): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: violations.map(
      (violation) => MODERATION_VIOLATION_MESSAGES[violation],
    ),
    violations,
  });

// Messages plus the codes, so the client can say why in its language.
const changeViolationsError = (
  violations: EventChangeViolation[],
): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: violations.map(
      (violation) => CHANGE_VIOLATION_MESSAGES[violation],
    ),
    violations,
  });

@Injectable()
export class EventsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly activitiesService: ActivitiesService,
    private readonly cancellationReasonsService: CancellationReasonsService,
    private readonly notificationsService: NotificationsService,
    private readonly groupsService: GroupsService,
    private readonly blocks: UserBlockVisibility,
  ) {}

  // F-06.3: the cards of events another module already picked.
  getListItemsByIds(ids: string[]): Promise<EventListItem[]> {
    return ids.length === 0
      ? Promise.resolve([])
      : this.eventRepository.getListItemsByIds(ids);
  }

  // F-06.3, #177: a page of what the person organizes, what is still ahead
  // first. The caller has checked the filter.
  getOrganizedEvents(
    user: Identity,
    page: Page,
    filter: EventFilter,
    now: Date = new Date(),
  ): Promise<EventListPage> {
    return this.eventRepository.getOrganizedBy(user.id, now, page, filter);
  }

  async createEvent(user: Identity, data: CreateEventData): Promise<Event> {
    // F-03.2: publishing needs a verified e-mail.
    if (!user.emailVerified) {
      throw emailNotVerifiedException('publishing an event');
    }
    const now = new Date();
    const violations = eventRuleViolations(data, now);
    if (violations.length > 0) {
      // Same shape as class-validator's errors, so the client reads both alike.
      throw new BadRequestException(
        violations.map((violation) => VIOLATION_MESSAGES[violation]),
      );
    }
    if (!(await this.activitiesService.isAvailable(data.activityId))) {
      throw new BadRequestException(
        'Activity does not exist or is no longer offered',
      );
    }
    return this.eventRepository.createPublishedEvent({
      ...data,
      // F-05.1: the organizer is whoever is signed in, never the request body.
      organizerId: user.id,
      publishedAt: now,
    });
  }

  // F-05.10: only the organizer changes an event, and only until it starts.
  async updateEvent(
    user: Identity,
    id: string,
    data: UpdateEventData,
  ): Promise<Event> {
    const event = await this.getEventOfOrganizer(user, id);
    const now = new Date();
    const violations = [
      ...eventChangeViolations(
        event,
        {
          kind: 'update',
          maxParticipants: data.maxParticipants,
          externalOccupiedSpots: data.externalOccupiedSpots,
          venueType: data.venueType,
          hasLocation: data.location != null,
          isAddressPublic: data.isAddressPublic,
        },
        now,
      ).map((violation) => CHANGE_VIOLATION_MESSAGES[violation]),
      ...eventRuleViolations(data, now).map(
        (violation) => VIOLATION_MESSAGES[violation],
      ),
    ];
    if (violations.length > 0) throw new BadRequestException(violations);
    if (
      data.activityId !== event.activity.id &&
      !(await this.activitiesService.isAvailable(data.activityId))
    ) {
      throw new BadRequestException(
        'Activity does not exist or is no longer offered',
      );
    }
    // The write repeats the checks that other requests can change meanwhile.
    const result = await this.eventRepository.updateEvent(id, data, now);
    if (!result.ok) {
      throw new BadRequestException(
        CHANGE_VIOLATION_MESSAGES[result.violation],
      );
    }
    // F-09.3: the people who go hear about a moved time or place, once the
    // change is saved (ADR-0015). Other edits are theirs to discover.
    const changes = eventChangesOf(event, result.event);
    if (changes.length > 0) {
      const { participantIds } =
        await this.eventRepository.getEventAudience(id);
      await this.notificationsService.notifyEventChanged({
        event: result.event,
        changes,
        participantIds,
        changedBy: user,
      });
    }
    return result.event;
  }

  async cancelEvent(
    user: Identity,
    id: string,
    data: CancelEventData,
  ): Promise<Event> {
    const event = await this.getEventOfOrganizer(user, id);
    const now = new Date();
    const violations = eventChangeViolations(event, { kind: 'cancel' }, now);
    if (violations.length > 0) {
      throw new BadRequestException(
        violations.map((violation) => CHANGE_VIOLATION_MESSAGES[violation]),
      );
    }
    if (
      !(await this.cancellationReasonsService.isAvailable(
        data.cancellationReasonId,
      ))
    ) {
      throw new BadRequestException('Cancellation reason does not exist');
    }
    const result = await this.eventRepository.cancelEvent(id, data, now);
    if (!result.ok) {
      throw new BadRequestException(
        CHANGE_VIOLATION_MESSAGES[result.violation],
      );
    }
    // F-09.3: the participants and the people still waiting came for nothing.
    const audience = await this.eventRepository.getEventAudience(id);
    await this.notificationsService.notifyEventCancelled({
      event: result.event,
      ...audience,
      cancelledBy: user,
    });
    return result.event;
  }

  // F-05.6: the seats taken outside the app, changed on the participants page
  // by any of the organizers. No notification: who goes is unchanged for the
  // people who go.
  async updateExternalOccupiedSpots(
    user: Identity,
    id: string,
    externalOccupiedSpots: number,
    now: Date = new Date(),
  ): Promise<Event> {
    const event = await this.getManagedEvent(user, id);
    const violations = externalSpotsViolations(
      event,
      externalOccupiedSpots,
      now,
    );
    if (violations.length > 0) throw changeViolationsError(violations);
    // The write repeats the check: a seat may have been approved meanwhile.
    const result = await this.eventRepository.updateExternalOccupiedSpots(
      id,
      externalOccupiedSpots,
      now,
    );
    if (!result.ok) throw changeViolationsError([result.violation]);
    return result.event;
  }

  // The whole event for any of its organizers (F-05.6 participants page, the
  // edit form); to anyone else it does not exist.
  async getManagedEvent(user: Identity, id: string): Promise<Event> {
    await this.getOrganizedEvent(id, user);
    return this.getEvent(id);
  }

  // The event for its organizer to read or change; anyone else is refused.
  async getEventOfOrganizer(user: Identity, id: string): Promise<Event> {
    const event = await this.getEvent(id);
    if (event.organizerId !== user.id) {
      throw new ForbiddenException('Only the organizer can manage the event');
    }
    return event;
  }

  async getEvent(id: string): Promise<Event> {
    const event = await this.eventRepository.getEventById(id);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  // #215: the ids of the landing rows, one list per selection and in its
  // order, without the events of people blocked from the viewer (#239). A row
  // whose query fails is null, so the others still show.
  async getLandingEventIds(
    selections: LandingEventSelection[],
    viewer?: Identity,
    now: Date = new Date(),
  ): Promise<(string[] | null)[]> {
    const hidden = await this.blocks.hiddenFor(viewer?.id);
    return Promise.all(
      selections.map((selection) =>
        this.eventRepository
          .getLandingEventIds(now, selection, hidden, viewer?.id)
          .catch((): null => null),
      ),
    );
  }

  // #215: the cities a visitor may pick for "near", most events first.
  async getLandingCities(
    limit: number,
    viewer?: Identity,
    now: Date = new Date(),
  ): Promise<LandingCity[]> {
    return this.eventRepository.getLandingCities(
      now,
      await this.blocks.hiddenFor(viewer?.id),
      limit,
    );
  }

  // #215: what the person already is on these events.
  getViewerStates(
    eventIds: string[],
    userId: string,
  ): Promise<Map<string, ViewerEventState>> {
    return this.eventRepository.getViewerStates(eventIds, userId);
  }

  // #215: which of the people organize these events or hold a seat on them.
  // Whose name may be shown is the caller's business.
  getAttendees(eventIds: string[], userIds: string[]): Promise<EventAttendee[]> {
    return this.eventRepository.getAttendees(eventIds, userIds);
  }

  // #215: the main organizer of each event, for their score.
  getOrganizerIds(eventIds: string[]): Promise<Map<string, string>> {
    return this.eventRepository.getOrganizerIds(eventIds);
  }

  // #239: without the events of people blocked from the one asking.
  async getUpcomingPublicEvents(
    page: Page,
    filter: EventListFilter = { activityIds: [] },
    now: Date = new Date(),
    viewer?: Identity,
  ): Promise<EventListPage> {
    if (eventListFilterViolations(filter).length > 0) {
      throw new BadRequestException(
        'A range must not start after it ends (dateFrom/dateTo, priceFrom/priceTo, durationHoursFrom/durationHoursTo, capacityFrom/capacityTo)',
      );
    }
    return this.eventRepository.getUpcomingPublicEvents(now, page, {
      ...filter,
      hiddenOrganizerIds: await this.blocks.hiddenFor(viewer?.id),
    });
  }

  // F-06.5: the exact address and the contacts, for the organizers and the
  // people holding a seat. Everyone else is told no, never the data.
  async getParticipantInfo(
    user: Identity,
    id: string,
  ): Promise<ParticipantEventInfo> {
    const facts = await this.getVisibleEventSeatFacts(id, user.id);
    if (!facts) throw new NotFoundException('Event not found');
    // Only while the event is on: a cancelled or finished one keeps its
    // address and contacts to itself.
    if (facts.status !== 'PUBLISHED' || facts.endAt.getTime() <= Date.now()) {
      throw new ForbiddenException('The event is no longer on');
    }
    if (!facts.hasSeat && !isOrganizerOf(facts, user.id)) {
      throw new ForbiddenException(
        'Only the organizer and approved participants can see this',
      );
    }
    const info = await this.eventRepository.getParticipantInfo(id);
    if (!info) throw new NotFoundException('Event not found');
    return info;
  }

  // The detail: what a visitor may see, nothing of the organizer's private
  // data. A group-only event (F-07.2) only for those `canSeeEvent` lets in;
  // to anyone else it does not exist. One an administrator hid exists only
  // for its organizers, who also see why (ADR-0022).
  async getEventDetail(id: string, viewer?: Identity): Promise<EventDetail> {
    return (await this.loadVisibleEvent(id, viewer)).event;
  }

  // #240, ADR-0023: who organizes an event the viewer may report, which is
  // any event whose detail they may open. Anything else does not exist for
  // them, the same 404 as the detail.
  async getVisibleEventOrganizerIds(
    id: string,
    viewer: Identity,
  ): Promise<readonly string[]> {
    const { loadFacts } = await this.loadVisibleEvent(id, viewer);
    const facts = await loadFacts();
    if (!facts) throw new NotFoundException('Event not found');
    return facts.organizerIds;
  }

  // The detail with the checks of `getEventDetail`. The facts are loaded at
  // most once, and only when a check needs them; the caller may ask for them
  // too through `loadFacts`.
  private async loadVisibleEvent(
    id: string,
    viewer?: Identity,
  ): Promise<{
    event: EventDetail;
    loadFacts: () => Promise<EventFacts | null>;
  }> {
    let facts: Promise<EventFacts | null> | undefined;
    const loadFacts = (): Promise<EventFacts | null> =>
      (facts ??= this.eventRepository.getEventFacts(id));
    const notFound = (): NotFoundException =>
      new NotFoundException('Event not found');

    let event = await this.eventRepository.getShowableEventById(id);
    if (!event && viewer) {
      const hiddenEvent = await loadFacts();
      if (hiddenEvent?.isHidden && isOrganizerOf(hiddenEvent, viewer.id)) {
        event = await this.eventRepository.getHiddenEventDetail(id);
      }
    }
    if (!event) throw notFound();
    // #239: an event of someone blocked from the viewer does not exist.
    if (viewer) {
      const hidden = await this.blocks.hiddenFor(viewer.id);
      if (hidden.length > 0) {
        const organizerIds = (await loadFacts())?.organizerIds ?? [];
        if (organizerIds.some((organizerId) => hidden.includes(organizerId))) {
          throw notFound();
        }
      }
    }
    if (event.visibility !== 'PUBLIC') {
      const current = await loadFacts();
      if (!current || !(await this.canSee(current, viewer?.id))) {
        throw notFound();
      }
    }
    return { event, loadFacts };
  }

  // F-06.1: null when there is no such event this person may see.
  async getVisibleEventSeatFacts(
    id: string,
    userId: string,
  ): Promise<EventSeatFacts | null> {
    const facts = await this.eventRepository.getShowableEventSeatFacts(
      id,
      userId,
    );
    if (!facts) return null;
    // #239: no request to, nor seat on, an event of someone blocked from them.
    const hidden = await this.blocks.hiddenFor(userId);
    if (
      facts.organizerIds.some((organizerId) => hidden.includes(organizerId))
    ) {
      return null;
    }
    return (await this.canSee(facts, userId)) ? facts : null;
  }

  // F-07.2: the events of a group on its page. Everyone who may see the group
  // gets its upcoming public events (visibility matrix); its members also the
  // group-only ones and the past ones. To anyone else the past do not exist.
  async getGroupEvents(
    groupId: string,
    viewer: Identity | undefined,
    period: GroupEventsPeriod,
    offset: number,
    now = new Date(),
  ): Promise<GroupEventPage> {
    const role = viewer
      ? await this.groupsService.getMemberRole(groupId, viewer.id)
      : null;
    if (!role) {
      // Throws "not found" for a group that has no public page, and for
      // one whose owner is blocked from the viewer (#239).
      await this.groupsService.getPublicGroup(groupId, viewer);
      if (period === 'past') throw new NotFoundException('Group not found');
    }
    return this.eventRepository.getGroupEvents(
      groupId,
      {
        period,
        visibilities: role ? ['PUBLIC', 'GROUP_ONLY'] : ['PUBLIC'],
        now,
        hiddenOrganizerIds: await this.blocks.hiddenFor(viewer?.id),
      },
      { limit: GROUP_EVENTS_PAGE_SIZE, offset },
    );
  }

  // `canSeeEvent` with the facts it needs: a public event needs no lookup; a
  // group-only one asks the group module about membership.
  private async canSee(
    facts: Pick<EventFacts, 'id' | 'visibility' | 'groupId' | 'organizerIds'>,
    userId: string | undefined,
  ): Promise<boolean> {
    if (facts.visibility === 'PUBLIC') return true;
    if (!userId) return false;
    const [role, isInvolved] = await Promise.all([
      facts.groupId
        ? this.groupsService.getMemberRole(facts.groupId, userId)
        : null,
      isOrganizerOf(facts, userId) ||
        this.eventRepository.isInvolvedIn(facts.id, userId),
    ]);
    return canSeeEvent(facts.visibility, {
      isGroupMember: role !== null,
      isInvolved,
    });
  }

  // The event for its organizers' own tools (requests F-05.7, participants
  // F-05.6, editing F-05.10, attendance F-05.11, waitlist F-05.9). To anyone
  // else it does not exist: the same 404 as a missing event, never a 403, so
  // nobody learns that the event, or what it holds, is there.
  async getOrganizedEvent(
    eventId: string,
    user: Identity,
  ): Promise<EventFacts> {
    const event = await this.eventRepository.getEventFacts(eventId);
    if (!event || !isOrganizerOf(event, user.id)) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  // #238: the administration sees every event (visibility matrix: Superadmin).
  async listEventsForAdministration(
    query: AdminListQuery,
  ): Promise<AdminPage<AdminEventListItem>> {
    return this.eventRepository.listForAdministration(query);
  }

  async getEventForAdministration(id: string): Promise<AdminEventDetail> {
    const detail = await this.eventRepository.getAdministrationDetail(id);
    if (!detail) throw new NotFoundException('Event not found');
    return detail;
  }

  // #239, ADR-0022: an administrator hides an event (with a reason) or brings
  // it back; the audit log records it with the change. Who expects the event
  // hears about it, unless it is over or was called off.
  async moderateEvent(
    admin: { id: string },
    id: string,
    moderation:
      | { kind: Extract<EventModeration, 'HIDE'>; reason: string }
      | { kind: Extract<EventModeration, 'RESTORE'> },
    now: Date = new Date(),
  ): Promise<AdminEventDetail> {
    const event = await this.getEvent(id);
    const violations = eventModerationViolations(event, moderation.kind);
    if (violations.length > 0) throw moderationViolationsError(violations);
    const changed = await this.eventRepository.setHidden(
      id,
      moderation.kind === 'HIDE'
        ? {
            kind: 'HIDE',
            adminId: admin.id,
            reason: moderation.reason.trim(),
            at: now,
          }
        : { kind: 'RESTORE', adminId: admin.id },
    );
    // Another administrator got there first.
    if (!changed) {
      throw moderationViolationsError(
        moderation.kind === 'HIDE'
          ? ['EVENT_ALREADY_HIDDEN']
          : ['EVENT_NOT_HIDDEN'],
      );
    }
    if (moderationConcernsPeople(changed, now)) {
      const audience = await this.eventRepository.getHiddenEventAudience(id);
      if (moderation.kind === 'HIDE') {
        await this.notificationsService.notifyEventHidden({
          event: changed,
          ...audience,
          reason: changed.hiddenReason ?? moderation.reason,
        });
      } else {
        await this.notificationsService.notifyEventRestored({
          event: changed,
          ...audience,
        });
      }
    }
    return this.getEventForAdministration(id);
  }

  // #238: the events of a person, for the user detail in the administration.
  getUserEventsForAdministration(userId: string): Promise<AdminUserEvents> {
    return this.eventRepository.getUserEventsForAdministration(userId);
  }
}

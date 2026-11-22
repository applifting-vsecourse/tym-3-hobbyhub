import {
  EventInterestPage,
  EventInterestState,
  InterestRuleViolation,
  interestRuleViolations,
  WatchRuleViolation,
  watchRuleViolations,
} from '@/modules/event-interest/domain/event-interest';
import { EventInterestRepository } from '@/modules/event-interest/repositories/event-interest.repository';
import {
  EventFilter,
  EventSeatFacts,
  Page,
} from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const VIOLATION_MESSAGES: Record<InterestRuleViolation, string> = {
  EVENT_CANCELLED: 'The event was cancelled',
  EVENT_NOT_HELD: 'The event did not take place',
  EVENT_FINISHED: 'The event is over',
  EVENT_STARTED: 'The event has already started',
  IS_ORGANIZER: 'The organizer cannot save their own event',
};

const WATCH_VIOLATION_MESSAGES: Record<WatchRuleViolation, string> = {
  EVENT_NOT_FULL: 'The event has a free seat; ask to join instead',
  EVENT_CANCELLED: 'The event was cancelled',
  EVENT_NOT_HELD: 'The event did not take place',
  EVENT_FINISHED: 'The event is over',
  EVENT_STARTED: 'The event has already started',
  IS_ORGANIZER: 'The organizer cannot watch their own event',
  HAS_SEAT: 'You already have a seat at this event',
  ALREADY_REQUESTED: 'You have already asked to join this event',
  REJECTED_BEFORE: 'Your request to join this event was rejected',
};

// Messages plus the codes, so the client can say why in its language.
const violationsError = <V extends string>(
  violations: V[],
  messages: Record<V, string>,
): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: violations.map((violation) => messages[violation]),
    violations,
  });

// #231, ADR-0030: the signed-in person's "Zajímá mě" list, and #232 the
// watching of a full event for a free seat. Only ever about the person asking:
// nothing here tells anyone who else saved or watches an event, or how many.
@Injectable()
export class EventInterestsService {
  constructor(
    private readonly repository: EventInterestRepository,
    private readonly eventsService: EventsService,
    private readonly requestsService: ParticipationRequestsService,
    private readonly blocks: UserBlockVisibility,
  ) {}

  // For the detail: whether the event is on the list and whether it may be
  // saved now; whether it is watched and whether watching may start now. An
  // event the person may not see does not exist, as on the detail.
  async getState(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<EventInterestState> {
    const event = await this.getVisibleEvent(user, eventId);
    const [row, watchViolations] = await Promise.all([
      this.repository.getRow(user.id, eventId),
      this.getWatchViolations(user, eventId, now),
    ]);
    return {
      ...row,
      violations: interestRuleViolations(event, user.id, now),
      watchViolations,
    };
  }

  // Saving twice keeps one row (a double tap, two windows).
  async save(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<EventInterestState> {
    const event = await this.getVisibleEvent(user, eventId);
    const violations = interestRuleViolations(event, user.id, now);
    if (violations.length > 0) {
      throw violationsError(violations, VIOLATION_MESSAGES);
    }
    await this.repository.save(user.id, eventId);
    return this.getState(user, eventId, now);
  }

  // Always allowed, whatever happened to the event since, and quiet when it
  // was not on the list: it says nothing about an event the person may not
  // see. The watching goes with it (#232).
  async remove(user: Identity, eventId: string): Promise<void> {
    await this.repository.remove(user.id, eventId);
  }

  // #232: watch a full event for a free seat; saves it to the list too. Only
  // while being full is the one thing keeping the person from asking to join.
  // Watching twice changes nothing.
  async watch(
    user: Identity,
    eventId: string,
    now: Date = new Date(),
  ): Promise<EventInterestState> {
    const event = await this.getVisibleEvent(user, eventId);
    const watchViolations = await this.getWatchViolations(user, eventId, now);
    if (watchViolations.length > 0) {
      throw violationsError(watchViolations, WATCH_VIOLATION_MESSAGES);
    }
    await this.repository.watch(user.id, eventId);
    return {
      isSaved: true,
      isWatching: true,
      violations: interestRuleViolations(event, user.id, now),
      watchViolations,
    };
  }

  // #232: always allowed and quiet, like removing; the event stays on the
  // list.
  async unwatch(user: Identity, eventId: string): Promise<void> {
    await this.repository.unwatch(user.id, eventId);
  }

  // #232: which of the person's saved events they may start watching now,
  // for the rows of "Zajímá mě". One look per event; a page is short.
  async getWatchableEventIds(
    user: Identity,
    eventIds: readonly string[],
    now: Date = new Date(),
  ): Promise<Set<string>> {
    const watchable = await Promise.all(
      eventIds.map(async (eventId) =>
        (await this.getWatchViolations(user, eventId, now)).length === 0
          ? [eventId]
          : [],
      ),
    );
    return new Set(watchable.flat());
  }

  // A page of the list for "Moje akce". The caller has checked the filter.
  async getMyPage(
    user: Identity,
    page: Page,
    filter: EventFilter,
    now: Date = new Date(),
  ): Promise<EventInterestPage> {
    return this.repository.getPage(user.id, now, page, {
      ...filter,
      // #239: an event of someone blocked from them is not on the list.
      hiddenOrganizerIds: await this.blocks.hiddenFor(user.id),
    });
  }

  // The rules of joining decide (`watchRuleViolations`); an event the person
  // may not see is not found, as everywhere else.
  private async getWatchViolations(
    user: Identity,
    eventId: string,
    now: Date,
  ): Promise<WatchRuleViolation[]> {
    const joinViolations = await this.requestsService.getJoinViolations(
      user,
      eventId,
      now,
    );
    if (!joinViolations) throw new NotFoundException('Event not found');
    return watchRuleViolations(joinViolations);
  }

  private async getVisibleEvent(
    user: Identity,
    eventId: string,
  ): Promise<EventSeatFacts> {
    const event = await this.eventsService.getVisibleEventSeatFacts(
      eventId,
      user.id,
    );
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}

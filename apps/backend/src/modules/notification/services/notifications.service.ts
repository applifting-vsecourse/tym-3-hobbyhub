import {
  Decision,
  EventChange,
  EventReminderKind,
  NewNotification,
  Notification,
  NotificationFilter,
  NotificationKind,
  NotificationPage,
  NotificationPayload,
  Page,
  RatingPromptKind,
  recipientsExcept,
  ReminderOccupancy,
} from '@/modules/notification/domain/notification';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { NotificationEmailsService } from '@/modules/notification/services/notification-emails.service';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

// What the places where something happens know, and hand over (ADR-0015):
// the facts, never who should be told or what is stored. This service decides
// the recipients from them and the payload per type, and depends on no other
// module's service, so none of them depends on it in a circle.
type Who = Pick<Identity, 'id'>;
type AnEvent = { id: string };
type AGroup = { id: string };
type ARequest = { userId: string; decisionMessage: string | null };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly emails: NotificationEmailsService,
    private readonly blocks: UserBlockVisibility,
  ) {}

  // -------------------------------------------------------------------------
  // The recipient's side: the bell and the page (#152).
  // -------------------------------------------------------------------------

  // #239: without what people blocked from the user caused.
  async listMine(
    user: Identity,
    page: Page,
    filter: NotificationFilter = {},
  ): Promise<NotificationPage> {
    return this.repository.listOf(
      user.id,
      page,
      filter,
      await this.blocks.hiddenFor(user.id),
    );
  }

  async countUnread(user: Identity): Promise<number> {
    return this.repository.countUnread(
      user.id,
      await this.blocks.hiddenFor(user.id),
    );
  }

  // Someone else's notification does not exist for the user: 404, never 403.
  async markRead(
    user: Identity,
    id: string,
    now: Date = new Date(),
  ): Promise<Notification> {
    const notification = await this.repository.markRead(user.id, id, now);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  // Without a kind every unread one; with it only the unread ones of that kind
  // (#175: the page marks read what its filter shows).
  markAllRead(
    user: Identity,
    kind?: NotificationKind,
    now: Date = new Date(),
  ): Promise<number> {
    return this.repository.markAllRead(user.id, now, kind);
  }

  // -------------------------------------------------------------------------
  // The places where something happens call one of these, after the change
  // is saved. None of them throws: the change stays, the worst case is a
  // missing notification (ADR-0015).
  // -------------------------------------------------------------------------

  // F-09.2: every organizer of the event, co-organizers included (ADR-0005).
  notifyNewParticipationRequest(input: {
    event: AnEvent & { organizerIds: readonly string[] };
    applicant: Who;
  }): Promise<void> {
    return this.record({
      type: 'NEW_REQUESTS',
      recipientIds: recipientsExcept(
        input.event.organizerIds,
        input.applicant.id,
      ),
      actorId: input.applicant.id,
      eventId: input.event.id,
    });
  }

  // F-06.4: every organizer of the event, with the participant's words, which
  // a cancellation always has (ADR-0017). Their e-mail (F-09.2, #58) leaves
  // the words out, as the visibility matrix asks of every e-mail.
  notifyParticipantCancelled(input: {
    event: AnEvent & { organizerIds: readonly string[] };
    participant: Who;
    message: string;
  }): Promise<void> {
    return this.record({
      type: 'PARTICIPANT_CANCELLED',
      recipientIds: recipientsExcept(
        input.event.organizerIds,
        input.participant.id,
      ),
      actorId: input.participant.id,
      eventId: input.event.id,
      payload: { message: input.message },
    });
  }

  // F-09.3: the applicant, with the organizer's words when there are any.
  notifyParticipationRequestDecided(input: {
    event: AnEvent;
    request: ARequest;
    decision: Decision;
    decidedBy: Who;
  }): Promise<void> {
    return this.record({
      type: 'REQUEST_DECIDED',
      recipientIds: recipientsExcept(
        [input.request.userId],
        input.decidedBy.id,
      ),
      actorId: input.decidedBy.id,
      eventId: input.event.id,
      payload: {
        decision: input.decision,
        ...(input.request.decisionMessage
          ? { message: input.request.decisionMessage }
          : {}),
      },
    });
  }

  // F-09.3: the approved participants, when the time or the place moved.
  // Nothing is sent for an edit that changed neither.
  notifyEventChanged(input: {
    event: AnEvent;
    changes: EventChange[];
    participantIds: readonly string[];
    changedBy: Who;
  }): Promise<void> {
    if (input.changes.length === 0) return Promise.resolve();
    return this.record({
      type: 'EVENT_CHANGED',
      recipientIds: recipientsExcept(input.participantIds, input.changedBy.id),
      actorId: input.changedBy.id,
      eventId: input.event.id,
      payload: { changes: input.changes },
    });
  }

  // F-09.3: the approved participants and the people still waiting for a
  // decision; both came for nothing otherwise.
  notifyEventCancelled(input: {
    event: AnEvent;
    participantIds: readonly string[];
    applicantIds: readonly string[];
    cancelledBy: Who;
  }): Promise<void> {
    return this.record({
      type: 'EVENT_CANCELLED',
      recipientIds: recipientsExcept(
        [...input.participantIds, ...input.applicantIds],
        input.cancelledBy.id,
      ),
      actorId: input.cancelledBy.id,
      eventId: input.event.id,
    });
  }

  // #239, ADR-0022: an administrator hid the event, or brought it back. The
  // organizers hear why it was hidden; the participants, the people waiting
  // for a decision and the waitlist only that it is gone or back. Nobody is
  // the actor: an administrator is not a user.
  async notifyEventHidden(input: {
    event: AnEvent;
    organizerIds: readonly string[];
    participantIds: readonly string[];
    applicantIds: readonly string[];
    waitlistedIds: readonly string[];
    reason: string;
  }): Promise<void> {
    await this.notifyModeration('EVENT_HIDDEN', input, {
      reason: input.reason,
    });
  }

  async notifyEventRestored(input: {
    event: AnEvent;
    organizerIds: readonly string[];
    participantIds: readonly string[];
    applicantIds: readonly string[];
    waitlistedIds: readonly string[];
  }): Promise<void> {
    await this.notifyModeration('EVENT_RESTORED', input, {});
  }

  private async notifyModeration(
    type: 'EVENT_HIDDEN' | 'EVENT_RESTORED',
    input: {
      event: AnEvent;
      organizerIds: readonly string[];
      participantIds: readonly string[];
      applicantIds: readonly string[];
      waitlistedIds: readonly string[];
    },
    organizerPayload: NotificationPayload,
  ): Promise<void> {
    const organizerIds = recipientsExcept(input.organizerIds, null);
    await this.record({
      type,
      recipientIds: organizerIds,
      actorId: null,
      eventId: input.event.id,
      payload: organizerPayload,
    });
    await this.record({
      type,
      recipientIds: recipientsExcept(
        [
          ...input.participantIds,
          ...input.applicantIds,
          ...input.waitlistedIds,
        ],
        null,
      ).filter((id) => !organizerIds.includes(id)),
      actorId: null,
      eventId: input.event.id,
    });
  }

  // #232: a seat freed up on a full event; everyone watching it, all at once.
  // The caller knows who watches, who may still see the event and who has no
  // seat; whoever freed the seat is left out here too. Nobody is the actor:
  // the watchers must not learn who left, nor the others who watches.
  notifySpotAvailable(input: {
    event: AnEvent;
    watcherIds: readonly string[];
    freedBy: Who | null;
  }): Promise<void> {
    return this.record({
      type: 'SPOT_AVAILABLE',
      recipientIds: recipientsExcept(
        input.watcherIds,
        input.freedBy?.id ?? null,
      ),
      actorId: null,
      eventId: input.event.id,
    });
  }

  // #240, ADR-0023: a report the user filed was dealt with. It names neither
  // the target nor the outcome, so it gives away no block between two people
  // and nothing of what the administrator did. Nobody is the actor.
  notifyReportResolved(input: { reporterId: string }): Promise<void> {
    return this.record({
      type: 'REPORT_RESOLVED',
      recipientIds: [input.reporterId],
      actorId: null,
    });
  }

  // #233, ADR-0021: the event starts in a day or in 2 hours. The organizers
  // (co-organizers included) get their own version, with how full the event
  // is; someone who organizes and has a seat gets only that one. Nobody
  // caused it, so there is no actor.
  async notifyEventReminder(input: {
    event: AnEvent;
    reminder: EventReminderKind;
    startAt: Date;
    organizerIds: readonly string[];
    participantIds: readonly string[];
    occupancy: ReminderOccupancy;
  }): Promise<void> {
    const organizerIds = recipientsExcept(input.organizerIds, null);
    const startsAt = input.startAt.toISOString();
    await this.record({
      type: 'HOSTED_EVENT_REMINDER',
      recipientIds: organizerIds,
      actorId: null,
      eventId: input.event.id,
      payload: {
        reminder: input.reminder,
        startsAt,
        occupancy: input.occupancy,
      },
    });
    await this.record({
      type: 'EVENT_REMINDER',
      recipientIds: recipientsExcept(input.participantIds, null).filter(
        (id) => !organizerIds.includes(id),
      ),
      actorId: null,
      eventId: input.event.id,
      payload: { reminder: input.reminder, startsAt },
    });
  }

  // #236, ADR-0027: the rating period of an event is on. The main organizer
  // gets one call for the whole event, each participant one to rate the
  // organizer; the caller decides who still has someone to rate. Nobody
  // caused it, so nobody is left out for a block here: the caller already
  // left out the participants blocked from the organizer.
  async notifyRatingPrompt(input: {
    event: AnEvent;
    prompt: RatingPromptKind;
    deadline: Date;
    organizerId: string | null;
    participantIds: readonly string[];
  }): Promise<void> {
    const payload = {
      prompt: input.prompt,
      deadline: input.deadline.toISOString(),
    };
    if (input.organizerId) {
      await this.record({
        type: 'HOSTED_RATING_PROMPT',
        recipientIds: [input.organizerId],
        actorId: null,
        eventId: input.event.id,
        payload,
      });
    }
    await this.record({
      type: 'RATING_PROMPT',
      recipientIds: recipientsExcept(input.participantIds, input.organizerId),
      actorId: null,
      eventId: input.event.id,
      payload,
    });
  }

  // F-07.3: the group's founder and admins (ADR-0007).
  notifyNewMembershipRequest(input: {
    group: AGroup;
    adminIds: readonly string[];
    applicant: Who;
  }): Promise<void> {
    return this.record({
      type: 'NEW_REQUESTS',
      recipientIds: recipientsExcept(input.adminIds, input.applicant.id),
      actorId: input.applicant.id,
      groupId: input.group.id,
    });
  }

  notifyMembershipRequestDecided(input: {
    group: AGroup;
    request: ARequest;
    decision: Decision;
    decidedBy: Who;
  }): Promise<void> {
    return this.record({
      type: 'REQUEST_DECIDED',
      recipientIds: recipientsExcept(
        [input.request.userId],
        input.decidedBy.id,
      ),
      actorId: input.decidedBy.id,
      groupId: input.group.id,
      payload: {
        decision: input.decision,
        ...(input.request.decisionMessage
          ? { message: input.request.decisionMessage }
          : {}),
      },
    });
  }

  private async record(data: NewNotification): Promise<void> {
    if (data.recipientIds.length === 0) return;
    let ids: string[];
    try {
      // #239: nobody hears from someone blocked from them.
      const hidden = data.actorId
        ? await this.blocks.hiddenFrom(data.actorId)
        : [];
      const recipientIds = data.recipientIds.filter(
        (id) => !hidden.includes(id),
      );
      if (recipientIds.length === 0) return;
      ids = await this.repository.createForRecipients({
        ...data,
        recipientIds,
      });
    } catch (error) {
      // The change that caused the notification is saved already; failing
      // the request now would tell the user it did not happen.
      this.logger.error(
        `Could not record a ${data.type} notification for ${data.recipientIds.length} recipient(s)`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }
    try {
      // F-09.5: the e-mails are made of the rows just written (ADR-0018).
      await this.emails.queueFor(ids);
    } catch (error) {
      // The bell has them; only the e-mail is missing.
      this.logger.error(
        `Could not queue the e-mails of a ${data.type} notification for ${ids.length} recipient(s)`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

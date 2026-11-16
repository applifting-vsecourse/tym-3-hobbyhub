import {
  Decision,
  EventChange,
  EventReminderKind,
  NewNotification,
  Notification,
  NotificationFilter,
  NotificationKind,
  NotificationPage,
  Page,
  recipientsExcept,
  ReminderOccupancy,
} from '@/modules/notification/domain/notification';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { NotificationEmailsService } from '@/modules/notification/services/notification-emails.service';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

// What the places where something happens know, and hand over (ADR-0015):
// the facts, never who should be told or what is stored. This service decides
// the recipients from them and the payload per type, and depends on no other
// module's service, so none of them depends on it in a circle.
type Who = Pick<Identity, 'id'>;
type AnEvent = { id: string };
type AGroup = { id: string };
type ARequest = { userId: string; decisionMessage: string | null };
type AFriendRequest = { id: string };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly emails: NotificationEmailsService,
  ) {}

  // -------------------------------------------------------------------------
  // The recipient's side: the bell and the page (#152).
  // -------------------------------------------------------------------------

  listMine(
    user: Identity,
    page: Page,
    filter: NotificationFilter = {},
  ): Promise<NotificationPage> {
    return this.repository.listOf(user.id, page, filter);
  }

  countUnread(user: Identity): Promise<number> {
    return this.repository.countUnread(user.id);
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

  // #228: the recipient of a friend request, unless the sender is over the
  // limit of notified requests (the friendship module decides, ADR-0026).
  notifyFriendRequest(input: {
    request: AFriendRequest;
    sender: Who;
    recipientId: string;
  }): Promise<void> {
    return this.record({
      type: 'FRIEND_REQUEST',
      recipientIds: recipientsExcept([input.recipientId], input.sender.id),
      actorId: input.sender.id,
      friendRequestId: input.request.id,
    });
  }

  // #228: the sender, once the recipient accepts. A rejection tells nobody.
  notifyFriendRequestAccepted(input: {
    request: AFriendRequest;
    senderId: string;
    acceptedBy: Who;
  }): Promise<void> {
    return this.record({
      type: 'FRIEND_REQUEST_ACCEPTED',
      recipientIds: recipientsExcept([input.senderId], input.acceptedBy.id),
      actorId: input.acceptedBy.id,
      friendRequestId: input.request.id,
    });
  }

  // #228: a withdrawn request takes its notification away (ADR-0026). An
  // e-mail already queued stays: it names nobody and leads to the tab.
  async removeFriendRequestNotifications(
    request: AFriendRequest,
  ): Promise<void> {
    try {
      await this.repository.deleteOfFriendRequest(request.id);
    } catch (error) {
      this.logger.error(
        `Could not remove the notifications of friend request ${request.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // #228: the recipient decided the request, wherever: its notification is
  // seen. Like the rest, it never fails the decision.
  async markFriendRequestNotificationRead(
    recipient: Who,
    request: AFriendRequest,
    now: Date = new Date(),
  ): Promise<void> {
    try {
      await this.repository.markReadOfFriendRequest(
        recipient.id,
        request.id,
        now,
      );
    } catch (error) {
      this.logger.error(
        `Could not mark the notification of friend request ${request.id} read`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async record(data: NewNotification): Promise<void> {
    if (data.recipientIds.length === 0) return;
    let ids: string[];
    try {
      ids = await this.repository.createForRecipients(data);
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

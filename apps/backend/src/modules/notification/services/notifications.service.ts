import {
  Decision,
  EventChange,
  NewNotification,
  Notification,
  NotificationFilter,
  NotificationPage,
  Page,
  recipientsExcept,
} from '@/modules/notification/domain/notification';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

// What the places where something happens know, and hand over (ADR-0015):
// the facts, never who should be told or what is stored. This service decides
// the recipients from them and the payload per type, and depends on no other
// module's service, so none of them depends on it in a circle.
type Who = Pick<Identity, 'id'>;
type AnEvent = { id: string };
type AGroup = { id: string };
type ARequest = { userId: string; rejectionReason: string | null };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly repository: NotificationRepository) {}

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

  markAllRead(user: Identity, now: Date = new Date()): Promise<number> {
    return this.repository.markAllRead(user.id, now);
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
        ...(input.request.rejectionReason
          ? { message: input.request.rejectionReason }
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
        ...(input.request.rejectionReason
          ? { message: input.request.rejectionReason }
          : {}),
      },
    });
  }

  private async record(data: NewNotification): Promise<void> {
    if (data.recipientIds.length === 0) return;
    try {
      await this.repository.createForRecipients(data);
    } catch (error) {
      // The change that caused the notification is saved already; failing
      // the request now would tell the user it did not happen.
      this.logger.error(
        `Could not record a ${data.type} notification for ${data.recipientIds.length} recipient(s)`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

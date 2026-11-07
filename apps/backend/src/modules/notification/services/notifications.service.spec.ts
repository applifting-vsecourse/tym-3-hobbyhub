import { Notification } from '@/modules/notification/domain/notification';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Logger, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { NotificationEmailsService } from './notification-emails.service';
import { NotificationsService } from './notifications.service';

const user = { id: 'u1' } as Identity;
const now = new Date('2030-01-01T12:00:00Z');

const aNotification = (
  overrides: Partial<Notification> = {},
): Notification => ({
  id: 'n1',
  type: 'NEW_REQUESTS',
  payload: {},
  createdAt: now,
  readAt: null,
  recipientId: 'u1',
  actor: { id: 'u2', name: 'Honza' },
  event: { id: 'e1', title: 'Čtvrteční florbal' },
  group: null,
  ...overrides,
});

describe('NotificationsService', () => {
  const setup = (): {
    repository: MockProxy<NotificationRepository>;
    emails: MockProxy<NotificationEmailsService>;
    service: NotificationsService;
  } => {
    const repository = mock<NotificationRepository>();
    repository.createForRecipients.mockResolvedValue(['n1']);
    const emails = mock<NotificationEmailsService>();
    emails.queueFor.mockResolvedValue();
    return {
      repository,
      emails,
      service: new NotificationsService(repository, emails),
    };
  };

  describe('the recipient', () => {
    it('reads their own notifications, a page at a time', async () => {
      const { repository, service } = setup();
      const page = { items: [aNotification()], total: 1 };
      repository.listOf.mockResolvedValue(page);

      await expect(
        service.listMine(user, { limit: 20, offset: 0 }),
      ).resolves.toEqual(page);
      expect(repository.listOf).toHaveBeenCalledWith('u1', {
        limit: 20,
        offset: 0,
      });
    });

    it('marks one of their notifications read', async () => {
      const { repository, service } = setup();
      const read = aNotification({ readAt: now });
      repository.markRead.mockResolvedValue(read);

      await expect(service.markRead(user, 'n1', now)).resolves.toEqual(read);
      expect(repository.markRead).toHaveBeenCalledWith('u1', 'n1', now);
    });

    it("does not find someone else's notification", async () => {
      const { repository, service } = setup();
      repository.markRead.mockResolvedValue(null);

      await expect(service.markRead(user, 'n9', now)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('marks all of theirs read and says how many were unread', async () => {
      const { repository, service } = setup();
      repository.markAllRead.mockResolvedValue(3);

      await expect(service.markAllRead(user, now)).resolves.toBe(3);
      expect(repository.markAllRead).toHaveBeenCalledWith('u1', now);
    });
  });

  describe('a new request to join an event', () => {
    it('tells every organizer, co-organizers included', async () => {
      const { repository, service } = setup();

      await service.notifyNewParticipationRequest({
        event: { id: 'e1', organizerIds: ['organizer', 'co-organizer'] },
        applicant: { id: 'applicant' },
      });

      expect(repository.createForRecipients).toHaveBeenCalledWith({
        type: 'NEW_REQUESTS',
        recipientIds: ['organizer', 'co-organizer'],
        actorId: 'applicant',
        eventId: 'e1',
      });
    });
  });

  describe('a decided request to join an event', () => {
    it('tells the applicant the decision and the organizer’s words', async () => {
      const { repository, service } = setup();

      await service.notifyParticipationRequestDecided({
        event: { id: 'e1' },
        request: { userId: 'applicant', rejectionReason: 'Plno.' },
        decision: 'REJECTED',
        decidedBy: { id: 'organizer' },
      });

      expect(repository.createForRecipients).toHaveBeenCalledWith({
        type: 'REQUEST_DECIDED',
        recipientIds: ['applicant'],
        actorId: 'organizer',
        eventId: 'e1',
        payload: { decision: 'REJECTED', message: 'Plno.' },
      });
    });

    it('leaves the message out when there is none', async () => {
      const { repository, service } = setup();

      await service.notifyParticipationRequestDecided({
        event: { id: 'e1' },
        request: { userId: 'applicant', rejectionReason: null },
        decision: 'APPROVED',
        decidedBy: { id: 'organizer' },
      });

      expect(repository.createForRecipients).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { decision: 'APPROVED' } }),
      );
    });
  });

  describe('an edited event', () => {
    it('tells the participants what moved, but not the organizer who moved it', async () => {
      const { repository, service } = setup();

      await service.notifyEventChanged({
        event: { id: 'e1' },
        changes: ['TIME'],
        participantIds: ['p1', 'organizer', 'p2', 'p1'],
        changedBy: { id: 'organizer' },
      });

      expect(repository.createForRecipients).toHaveBeenCalledWith({
        type: 'EVENT_CHANGED',
        recipientIds: ['p1', 'p2'],
        actorId: 'organizer',
        eventId: 'e1',
        payload: { changes: ['TIME'] },
      });
    });

    it('says nothing about an edit that moved neither the time nor the place', async () => {
      const { repository, service } = setup();

      await service.notifyEventChanged({
        event: { id: 'e1' },
        changes: [],
        participantIds: ['p1'],
        changedBy: { id: 'organizer' },
      });

      expect(repository.createForRecipients).not.toHaveBeenCalled();
    });
  });

  describe('a cancelled event', () => {
    it('tells the participants and the people still waiting', async () => {
      const { repository, service } = setup();

      await service.notifyEventCancelled({
        event: { id: 'e1' },
        participantIds: ['p1'],
        applicantIds: ['a1', 'p1'],
        cancelledBy: { id: 'organizer' },
      });

      expect(repository.createForRecipients).toHaveBeenCalledWith({
        type: 'EVENT_CANCELLED',
        recipientIds: ['p1', 'a1'],
        actorId: 'organizer',
        eventId: 'e1',
      });
    });

    it('writes nothing when nobody is affected', async () => {
      const { repository, service } = setup();

      await service.notifyEventCancelled({
        event: { id: 'e1' },
        participantIds: [],
        applicantIds: [],
        cancelledBy: { id: 'organizer' },
      });

      expect(repository.createForRecipients).not.toHaveBeenCalled();
    });
  });

  describe('a group', () => {
    it('tells the founder and the admins about a new request', async () => {
      const { repository, service } = setup();

      await service.notifyNewMembershipRequest({
        group: { id: 'g1' },
        adminIds: ['owner', 'admin'],
        applicant: { id: 'applicant' },
      });

      expect(repository.createForRecipients).toHaveBeenCalledWith({
        type: 'NEW_REQUESTS',
        recipientIds: ['owner', 'admin'],
        actorId: 'applicant',
        groupId: 'g1',
      });
    });

    it('tells the applicant the decision', async () => {
      const { repository, service } = setup();

      await service.notifyMembershipRequestDecided({
        group: { id: 'g1' },
        request: { userId: 'applicant', rejectionReason: null },
        decision: 'APPROVED',
        decidedBy: { id: 'admin' },
      });

      expect(repository.createForRecipients).toHaveBeenCalledWith({
        type: 'REQUEST_DECIDED',
        recipientIds: ['applicant'],
        actorId: 'admin',
        groupId: 'g1',
        payload: { decision: 'APPROVED' },
      });
    });
  });

  it('logs a failed write instead of failing the change that caused it', async () => {
    const { repository, emails, service } = setup();
    repository.createForRecipients.mockRejectedValue(new Error('db down'));
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(
      service.notifyNewMembershipRequest({
        group: { id: 'g1' },
        adminIds: ['owner'],
        applicant: { id: 'applicant' },
      }),
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
    expect(emails.queueFor).not.toHaveBeenCalled();
    error.mockRestore();
  });

  // F-09.5, ADR-0018.
  describe('the e-mails', () => {
    it('are made of the rows just written', async () => {
      const { repository, emails, service } = setup();
      repository.createForRecipients.mockResolvedValue(['n1', 'n2']);

      await service.notifyNewParticipationRequest({
        event: { id: 'e1', organizerIds: ['organizer', 'co-organizer'] },
        applicant: { id: 'applicant' },
      });

      expect(emails.queueFor).toHaveBeenCalledWith(['n1', 'n2']);
    });

    it('failing to queue leaves the notifications and the change alone', async () => {
      const { emails, service } = setup();
      emails.queueFor.mockRejectedValue(new Error('outbox down'));
      const error = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.notifyEventCancelled({
          event: { id: 'e1' },
          participantIds: ['p1'],
          applicantIds: [],
          cancelledBy: { id: 'organizer' },
        }),
      ).resolves.toBeUndefined();

      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });
  });
});

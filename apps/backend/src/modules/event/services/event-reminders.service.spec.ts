import { EventReminderCandidate } from '@/modules/event/domain/event-reminder';
import { EventReminderRepository } from '@/modules/event/repositories/event-reminder.repository';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { Logger } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { EventRemindersService } from './event-reminders.service';

const HOUR = 60 * 60 * 1000;
const startAt = new Date('2030-01-10T18:00:00Z');
const occupancy = {
  occupiedSpots: 5,
  maxParticipants: 10,
  missingToMinimum: 0,
};

const aCandidate = (
  overrides: Partial<EventReminderCandidate> = {},
): EventReminderCandidate => ({
  id: 'e1',
  startAt,
  publishedAt: new Date('2030-01-01T10:00:00Z'),
  sent: [],
  organizerIds: ['organizer'],
  participantIds: ['p1', 'p2'],
  occupancy,
  ...overrides,
});

describe('EventRemindersService', () => {
  let logs: jest.SpyInstance[];
  beforeEach(() => {
    logs = [
      jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined),
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
    ];
  });
  afterEach(() => logs.forEach((spy) => spy.mockRestore()));

  const setup = (
    candidates: EventReminderCandidate[],
  ): {
    repository: MockProxy<EventReminderRepository>;
    notifications: MockProxy<NotificationsService>;
    service: EventRemindersService;
  } => {
    const repository = mock<EventReminderRepository>();
    repository.findCandidates.mockResolvedValue(candidates);
    repository.claim.mockResolvedValue(true);
    const notifications = mock<NotificationsService>();
    notifications.notifyEventReminder.mockResolvedValue();
    return {
      repository,
      notifications,
      service: new EventRemindersService(repository, notifications),
    };
  };

  it('claims a due reminder for this start and sends it', async () => {
    const { repository, notifications, service } = setup([aCandidate()]);
    const now = new Date(startAt.getTime() - 23 * HOUR);

    await service.tick(now);

    expect(repository.findCandidates).toHaveBeenCalledWith(now);
    expect(repository.claim).toHaveBeenCalledWith('e1', 'DAY', startAt);
    expect(notifications.notifyEventReminder).toHaveBeenCalledWith({
      event: { id: 'e1' },
      reminder: 'DAY',
      startAt,
      organizerIds: ['organizer'],
      participantIds: ['p1', 'p2'],
      occupancy,
    });
  });

  it('sends nothing when another pass claimed it first', async () => {
    const { repository, notifications, service } = setup([aCandidate()]);
    repository.claim.mockResolvedValue(false);

    await service.tick(new Date(startAt.getTime() - 2 * HOUR));

    expect(notifications.notifyEventReminder).not.toHaveBeenCalled();
  });

  it('leaves alone an event with nothing due', async () => {
    const { repository, notifications, service } = setup([aCandidate()]);

    await service.tick(new Date(startAt.getTime() - 30 * HOUR));

    expect(repository.claim).not.toHaveBeenCalled();
    expect(notifications.notifyEventReminder).not.toHaveBeenCalled();
  });

  it('runs a pass on schedule, at the current time', async () => {
    const { repository, service } = setup([]);

    await service.onSchedule();

    expect(repository.findCandidates).toHaveBeenCalledWith(expect.any(Date));
  });

  it('never starts a pass while the last one still runs', async () => {
    const { repository, service } = setup([]);
    let finish: (value: EventReminderCandidate[]) => void = () => undefined;
    repository.findCandidates.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    const first = service.tick(startAt);
    await service.tick(startAt);
    finish([]);
    await first;

    expect(repository.findCandidates).toHaveBeenCalledTimes(1);
  });

  it('never throws: a failed pass is logged and the next one tries again', async () => {
    const { repository, service } = setup([]);
    repository.findCandidates.mockRejectedValue(new Error('db down'));

    await expect(service.tick(startAt)).resolves.toBeUndefined();
    expect(logs[1]).toHaveBeenCalledWith(
      expect.stringContaining('db down'),
      expect.any(String),
    );
  });
});

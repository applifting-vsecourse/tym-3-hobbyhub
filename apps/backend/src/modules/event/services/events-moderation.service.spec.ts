import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CancellationReasonsService } from '@/modules/cancellation-reason/services/cancellation-reasons.service';
import {
  AdminEventDetail,
  Event,
  EventDetail,
  EventFacts,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { GroupsService } from '@/modules/group/services/groups.service';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { EventsService } from './events.service';

// #239, ADR-0022: an administrator hides an event and brings it back.

const NOW = new Date('2030-01-01T12:00:00Z');
const admin = { id: 'admin1' };
const REASON = 'Akce nabízí placené služby.';

const anEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 'e1',
    status: 'PUBLISHED',
    endAt: new Date('2030-01-02T12:00:00Z'),
    isHidden: false,
    hiddenReason: null,
    ...overrides,
  }) as Event;

const audience = {
  participantIds: ['p1'],
  applicantIds: ['a1'],
  waitlistedIds: ['w1'],
  organizerIds: ['organizer', 'co-organizer'],
};

describe('EventsService – moderation (#239)', () => {
  const setup = (
    event: Event | null = anEvent(),
  ): {
    repository: MockProxy<EventRepository>;
    notifications: MockProxy<NotificationsService>;
    service: EventsService;
  } => {
    const repository = mock<EventRepository>();
    repository.getEventById.mockResolvedValue(event);
    repository.getHiddenEventAudience.mockResolvedValue(audience);
    repository.getAdministrationDetail.mockResolvedValue({
      isHidden: true,
    } as AdminEventDetail);
    const notifications = mock<NotificationsService>();
    return {
      repository,
      notifications,
      service: new EventsService(
        repository,
        mock<ActivitiesService>(),
        mock<CancellationReasonsService>(),
        notifications,
        mock<GroupsService>(),
      ),
    };
  };

  it('hides an event with the reason, by the administrator', async () => {
    const { repository, notifications, service } = setup();
    repository.setHidden.mockResolvedValue(
      anEvent({ isHidden: true, hiddenReason: REASON }),
    );

    await service.moderateEvent(
      admin,
      'e1',
      { kind: 'HIDE', reason: `  ${REASON} ` },
      NOW,
    );

    expect(repository.setHidden).toHaveBeenCalledWith('e1', {
      kind: 'HIDE',
      adminId: 'admin1',
      reason: REASON,
      at: NOW,
    });
    expect(notifications.notifyEventHidden).toHaveBeenCalledWith({
      event: expect.objectContaining({ id: 'e1' }),
      ...audience,
      reason: REASON,
    });
  });

  it('brings a hidden event back and tells the same people', async () => {
    const { repository, notifications, service } = setup(
      anEvent({ isHidden: true, hiddenReason: REASON }),
    );
    repository.setHidden.mockResolvedValue(anEvent());

    await service.moderateEvent(admin, 'e1', { kind: 'RESTORE' }, NOW);

    expect(repository.setHidden).toHaveBeenCalledWith('e1', {
      kind: 'RESTORE',
      adminId: 'admin1',
    });
    expect(notifications.notifyEventRestored).toHaveBeenCalledWith({
      event: expect.objectContaining({ id: 'e1' }),
      ...audience,
    });
  });

  it('tells nobody about an event that is over', async () => {
    const over = anEvent({ endAt: new Date('2029-12-31T12:00:00Z') });
    const { repository, notifications, service } = setup(over);
    repository.setHidden.mockResolvedValue({ ...over, isHidden: true });

    await service.moderateEvent(
      admin,
      'e1',
      { kind: 'HIDE', reason: REASON },
      NOW,
    );

    expect(repository.setHidden).toHaveBeenCalled();
    expect(notifications.notifyEventHidden).not.toHaveBeenCalled();
  });

  it.each([
    ['a draft', anEvent({ status: 'DRAFT' }), 'HIDE'],
    ['a hidden event again', anEvent({ isHidden: true }), 'HIDE'],
    ['an event that is not hidden', anEvent(), 'RESTORE'],
  ] as const)('refuses to moderate %s', async (_case, event, kind) => {
    const { repository, service } = setup(event);

    await expect(
      service.moderateEvent(
        admin,
        'e1',
        kind === 'HIDE' ? { kind, reason: REASON } : { kind },
        NOW,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.setHidden).not.toHaveBeenCalled();
  });

  it('refuses when another administrator got there first', async () => {
    const { repository, notifications, service } = setup();
    repository.setHidden.mockResolvedValue(null);

    await expect(
      service.moderateEvent(admin, 'e1', { kind: 'HIDE', reason: REASON }, NOW),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(notifications.notifyEventHidden).not.toHaveBeenCalled();
  });

  it('answers 404 for a missing event', async () => {
    const { service } = setup(null);

    await expect(
      service.moderateEvent(admin, 'nope', { kind: 'RESTORE' }, NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('the detail of a hidden event', () => {
    const facts = {
      id: 'e1',
      isHidden: true,
      organizerIds: ['organizer', 'co-organizer'],
    } as EventFacts;
    const hiddenDetail = {
      id: 'e1',
      visibility: 'PUBLIC',
      hiddenReason: REASON,
    } as EventDetail;

    const hiddenSetup = (): ReturnType<typeof setup> => {
      const context = setup();
      context.repository.getShowableEventById.mockResolvedValue(null);
      context.repository.getEventFacts.mockResolvedValue(facts);
      context.repository.getHiddenEventDetail.mockResolvedValue(hiddenDetail);
      return context;
    };

    it.each(['organizer', 'co-organizer'])(
      'is there for an organizer (%s), with the reason',
      async (id) => {
        const { service } = hiddenSetup();

        await expect(
          service.getEventDetail('e1', { id } as Identity),
        ).resolves.toEqual(hiddenDetail);
      },
    );

    it('does not exist for anyone else, nor for a visitor', async () => {
      const { repository, service } = hiddenSetup();

      await expect(
        service.getEventDetail('e1', { id: 'participant' } as Identity),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getEventDetail('e1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.getHiddenEventDetail).not.toHaveBeenCalled();
    });
  });
});

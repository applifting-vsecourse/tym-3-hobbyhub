import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CancellationReasonsService } from '@/modules/cancellation-reason/services/cancellation-reasons.service';
import { CreateEventData, Event } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { EventsService } from './events.service';

const inAnHour = (): Date => new Date(Date.now() + 3600 * 1000);

const anEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'e1',
  title: 'Čtvrteční florbal',
  description: 'Rekreační hra pro mírně pokročilé.',
  equipment: null,
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  venueType: 'PUBLIC_VENUE',
  approvalMode: 'MANUAL',
  startAt: inAnHour(),
  endAt: new Date(inAnHour().getTime() + 3600 * 1000),
  publishedAt: new Date(),
  createdAt: new Date(),
  minParticipants: 8,
  maxParticipants: 12,
  contributionAmount: 80,
  contributionNote: null,
  location: {
    street: 'Chabařovická 4',
    city: 'Praha 8',
    postalCode: '18200',
    country: 'Česko',
    placeName: 'ZŠ Kobylisy',
  },
  activity: {
    id: 'a1',
    name: 'Florbal',
    icon: 'florbal',
    defaultMinParticipants: 8,
    defaultMaxParticipants: 12,
  },
  organizerId: 'u1',
  cancellationReason: null,
  cancellationNote: null,
  externalOccupiedSpots: 4,
  approvedCount: 0,
  occupiedSpots: 4,
  missingToMinimum: 4,
  freeSpots: 8,
  fillState: 'BELOW_MINIMUM',
  ...overrides,
});

const input = (): CreateEventData => ({
  title: 'Čtvrteční florbal',
  activityId: 'a1',
  description: 'Rekreační hra pro mírně pokročilé.',
  venueType: 'PUBLIC_VENUE',
  approvalMode: 'AUTOMATIC',
  startAt: inAnHour(),
  endAt: new Date(inAnHour().getTime() + 3600 * 1000),
  location: {
    street: 'Chabařovická 4',
    city: 'Praha 8',
    postalCode: '18200',
    country: 'Česko',
  },
  minParticipants: 8,
  maxParticipants: 12,
  externalOccupiedSpots: 4,
});

describe('EventsService', () => {
  const setup = (
    isActivityAvailable = true,
    isReasonAvailable = true,
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    const activities = mock<ActivitiesService>();
    activities.isAvailable.mockResolvedValue(isActivityAvailable);
    const reasons = mock<CancellationReasonsService>();
    reasons.isAvailable.mockResolvedValue(isReasonAvailable);
    return {
      repository,
      service: new EventsService(repository, activities, reasons),
    };
  };

  it('publishes the event with the signed-in user as organizer', async () => {
    const { repository, service } = setup();
    const created = anEvent();
    repository.createPublishedEvent.mockResolvedValue(created);
    const data = input();

    await expect(
      service.createEvent({ id: 'u1' } as Identity, data),
    ).resolves.toEqual(created);
    expect(repository.createPublishedEvent).toHaveBeenCalledWith({
      ...data,
      organizerId: 'u1',
      publishedAt: expect.any(Date),
    });
  });

  it.each([
    ['a start in the past', { startAt: new Date(Date.now() - 1000) }],
    ['an end before the start', { endAt: new Date(Date.now() + 1000) }],
    ['a minimum above the maximum', { minParticipants: 13 }],
    ['more occupied seats than the maximum', { externalOccupiedSpots: 13 }],
  ])('refuses %s', async (_, override) => {
    const { repository, service } = setup();

    await expect(
      service.createEvent({ id: 'u1' } as Identity, {
        ...input(),
        ...override,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createPublishedEvent).not.toHaveBeenCalled();
  });

  it('refuses an activity that does not exist or is retired', async () => {
    const { repository, service } = setup(false);

    await expect(
      service.createEvent({ id: 'u1' } as Identity, input()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createPublishedEvent).not.toHaveBeenCalled();
  });

  it('passes the page and the activity filter to the list', async () => {
    const { repository, service } = setup();
    const now = new Date();
    repository.getUpcomingPublicEvents.mockResolvedValue({
      items: [],
      total: 0,
    });

    await service.getUpcomingPublicEvents(
      { limit: 20, offset: 0 },
      { activityIds: ['a1'] },
      now,
    );

    expect(repository.getUpcomingPublicEvents).toHaveBeenCalledWith(
      now,
      { limit: 20, offset: 0 },
      { activityIds: ['a1'] },
    );
  });

  it('reports a missing event as not found', async () => {
    const { repository, service } = setup();
    repository.getEventById.mockResolvedValue(null);

    await expect(service.getEvent('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports a public event that does not exist, or is not public, as not found', async () => {
    const { repository, service } = setup();
    repository.getPublicEventById.mockResolvedValue(null);

    await expect(service.getPublicEvent('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('updateEvent', () => {
    const organizer = { id: 'u1' } as Identity;

    it('saves the changes of the organizer', async () => {
      const { repository, service } = setup();
      const event = anEvent();
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({ ok: true, event });
      const data = input();

      await expect(service.updateEvent(organizer, 'e1', data)).resolves.toEqual(
        event,
      );
      expect(repository.updateEvent).toHaveBeenCalledWith(
        'e1',
        data,
        expect.any(Date),
      );
    });

    it('refuses someone who is not the organizer', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent({ id: 'u2' } as Identity, 'e1', input()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('reports a missing event as not found', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(null);

      await expect(
        service.updateEvent(organizer, 'nope', input()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses an event that has started', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ startAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', input()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('refuses a cancelled event', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ status: 'CANCELLED' }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', input()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a capacity below the occupied seats', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ approvedCount: 6, occupiedSpots: 10 }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          minParticipants: 2,
          maxParticipants: 9,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('applies the rules of a new event to the change', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          startAt: new Date(Date.now() - 1000),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('edits an online event without an address', async () => {
      const { repository, service } = setup();
      const event = anEvent({ venueType: 'ONLINE', location: null });
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({ ok: true, event });

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          venueType: 'ONLINE',
          location: undefined,
        }),
      ).resolves.toEqual(event);
    });

    it('refuses turning an online event into a place', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ venueType: 'ONLINE', location: null }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', input()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('refuses an event at a place without an address', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          location: undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reports a change that stopped being allowed during the write', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());
      repository.updateEvent.mockResolvedValue({
        ok: false,
        violation: 'MAX_BELOW_OCCUPIED',
      });

      await expect(
        service.updateEvent(organizer, 'e1', input()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a new activity that is retired', async () => {
      const { repository, service } = setup(false);
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          activityId: 'a2',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancelEvent', () => {
    const organizer = { id: 'u1' } as Identity;
    const data = {
      cancellationReasonId: 'r1',
      cancellationNote: 'Zavřená hala',
    };

    it('cancels a published event of the organizer', async () => {
      const { repository, service } = setup();
      const cancelled = anEvent({ status: 'CANCELLED' });
      repository.getEventById.mockResolvedValue(anEvent());
      repository.cancelEvent.mockResolvedValue({ ok: true, event: cancelled });

      await expect(service.cancelEvent(organizer, 'e1', data)).resolves.toEqual(
        cancelled,
      );
      expect(repository.cancelEvent).toHaveBeenCalledWith(
        'e1',
        data,
        expect.any(Date),
      );
    });

    it('refuses someone who is not the organizer', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.cancelEvent({ id: 'u2' } as Identity, 'e1', data),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.cancelEvent).not.toHaveBeenCalled();
    });

    it.each([
      ['has started', { startAt: new Date(Date.now() - 1000) }],
      ['is already cancelled', { status: 'CANCELLED' as const }],
      ['is a draft', { status: 'DRAFT' as const }],
    ])('refuses an event that %s', async (_, override) => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent(override));

      await expect(
        service.cancelEvent(organizer, 'e1', data),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.cancelEvent).not.toHaveBeenCalled();
    });

    it('reports a cancel that lost the race to another one', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());
      repository.cancelEvent.mockResolvedValue({
        ok: false,
        violation: 'EVENT_NOT_CANCELLABLE',
      });

      await expect(
        service.cancelEvent(organizer, 'e1', data),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a reason that does not exist', async () => {
      const { repository, service } = setup(true, false);
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.cancelEvent(organizer, 'e1', data),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.cancelEvent).not.toHaveBeenCalled();
    });
  });
});

import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CreateEventData, Event } from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  ): { repository: MockProxy<EventRepository>; service: EventsService } => {
    const repository = mock<EventRepository>();
    const activities = mock<ActivitiesService>();
    activities.isAvailable.mockResolvedValue(isActivityAvailable);
    return { repository, service: new EventsService(repository, activities) };
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

  it('reports a missing event as not found', async () => {
    const { repository, service } = setup();
    repository.getEventById.mockResolvedValue(null);

    await expect(service.getEvent('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

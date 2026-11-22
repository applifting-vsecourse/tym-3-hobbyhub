import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CancellationReasonsService } from '@/modules/cancellation-reason/services/cancellation-reasons.service';
import {
  CreateEventData,
  Event,
  EventDetail,
  EventFacts,
  EventSeatFacts,
  GROUP_EVENTS_PAGE_SIZE,
  UpdateEventData,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { GroupsService } from '@/modules/group/services/groups.service';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { EventsService } from './events.service';

// #239: nobody is blocked here; blocks have tests of their own.
const noBlocks = (): MockProxy<UserBlockVisibility> => {
  const blocks = mock<UserBlockVisibility>();
  blocks.hiddenFor.mockResolvedValue([]);
  blocks.hiddenFrom.mockResolvedValue([]);
  return blocks;
};

// One clock read for every fixture: two `anEvent()` calls must describe the
// same event, not two a millisecond apart.
const NOW = Date.now();
const inAnHour = (): Date => new Date(NOW + 3600 * 1000);

const anEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'e1',
  title: 'Čtvrteční florbal',
  description: 'Rekreační hra pro mírně pokročilé.',
  equipment: null,
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  venueType: 'PLACE',
  isAddressPublic: false,
  approvalMode: 'MANUAL',
  startAt: inAnHour(),
  endAt: new Date(inAnHour().getTime() + 3600 * 1000),
  publishedAt: new Date(NOW),
  createdAt: new Date(NOW),
  minParticipants: 8,
  maxParticipants: 12,
  contributionAmount: 80,
  contributionNote: null,
  contact: null,
  externalChatUrl: null,
  isHidden: false,
  hiddenReason: null,
  location: {
    street: 'Chabařovická 4',
    city: 'Praha 8',
    postalCode: '18200',
    country: 'Česko',
    placeName: 'ZŠ Kobylisy',
    latitude: 50.1297,
    longitude: 14.4421,
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

// A new event and an edit of one: the edit also says the kind of venue.
const input = (): CreateEventData & UpdateEventData => ({
  title: 'Čtvrteční florbal',
  activityId: 'a1',
  description: 'Rekreační hra pro mírně pokročilé.',
  venueType: 'PLACE',
  isAddressPublic: false,
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
  ): {
    repository: MockProxy<EventRepository>;
    notifications: MockProxy<NotificationsService>;
    groups: MockProxy<GroupsService>;
    service: EventsService;
  } => {
    const repository = mock<EventRepository>();
    repository.getEventAudience.mockResolvedValue({
      participantIds: [],
      applicantIds: [],
    });
    const activities = mock<ActivitiesService>();
    activities.isAvailable.mockResolvedValue(isActivityAvailable);
    const reasons = mock<CancellationReasonsService>();
    reasons.isAvailable.mockResolvedValue(isReasonAvailable);
    const notifications = mock<NotificationsService>();
    const groups = mock<GroupsService>();
    groups.getMemberRole.mockResolvedValue(null);
    return {
      repository,
      notifications,
      groups,
      service: new EventsService(
        repository,
        activities,
        reasons,
        notifications,
        groups,
        noBlocks(),
      ),
    };
  };

  it('refuses to publish for an unverified e-mail and saves nothing', async () => {
    const { repository, service } = setup();

    const error = await service
      .createEvent({ id: 'u1', emailVerified: false } as Identity, input())
      .then(
        () => null,
        (caught: unknown) => caught,
      );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(
      (error as BadRequestException).getResponse() as { violations: unknown },
    ).toMatchObject({ violations: ['EMAIL_NOT_VERIFIED'] });
    expect(repository.createPublishedEvent).not.toHaveBeenCalled();
  });

  it('publishes the event with the signed-in user as organizer', async () => {
    const { repository, service } = setup();
    const created = anEvent();
    repository.createPublishedEvent.mockResolvedValue(created);
    const data = input();

    await expect(
      service.createEvent({ id: 'u1', emailVerified: true } as Identity, data),
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
    [
      'a latitude without a longitude',
      { location: { ...input().location, latitude: 50.1 } },
    ],
    [
      'a longitude without a latitude',
      { location: { ...input().location, longitude: 14.4 } },
    ],
  ])('refuses %s', async (_, override) => {
    const { repository, service } = setup();

    await expect(
      service.createEvent({ id: 'u1', emailVerified: true } as Identity, {
        ...input(),
        ...override,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createPublishedEvent).not.toHaveBeenCalled();
  });

  it('refuses an activity that does not exist or is retired', async () => {
    const { repository, service } = setup(false);

    await expect(
      service.createEvent(
        { id: 'u1', emailVerified: true } as Identity,
        input(),
      ),
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
      { activityIds: ['a1'], hiddenOrganizerIds: [] },
    );
  });

  describe('similar events', () => {
    it('is a 404 when the viewer may not open the detail', async () => {
      const { repository, service } = setup();
      repository.getShowableEventById.mockResolvedValue(null);

      await expect(service.getSimilarEvents('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.getSimilarEvents).not.toHaveBeenCalled();
    });

    it('asks the repository for events like the one in the detail', async () => {
      const { repository, service } = setup();
      const now = new Date();
      repository.getShowableEventById.mockResolvedValue({
        visibility: 'PUBLIC',
      } as EventDetail);
      repository.getEventFacts.mockResolvedValue({
        organizerIds: ['o1'],
      } as EventFacts);
      repository.getSimilarEvents.mockResolvedValue([]);

      await service.getSimilarEvents('e1', { id: 'u1' } as Identity, now);

      expect(repository.getSimilarEvents).toHaveBeenCalledWith('e1', now, []);
    });
  });

  it('refuses a date range that ends before it starts', async () => {
    const { repository, service } = setup();

    await expect(
      service.getUpcomingPublicEvents(
        { limit: 20, offset: 0 },
        { activityIds: [], dateFrom: '2026-11-16', dateTo: '2026-11-15' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.getUpcomingPublicEvents).not.toHaveBeenCalled();
  });

  it.each([
    { priceFrom: 300, priceTo: 100 },
    { durationHoursFrom: 3, durationHoursTo: 1 },
    { capacityFrom: 12, capacityTo: 4 },
  ])('refuses a number range that ends before it starts: %j', async (range) => {
    const { repository, service } = setup();

    await expect(
      service.getUpcomingPublicEvents(
        { limit: 20, offset: 0 },
        { activityIds: [], ...range },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.getUpcomingPublicEvents).not.toHaveBeenCalled();
  });

  it('reports a missing event as not found', async () => {
    const { repository, service } = setup();
    repository.getEventById.mockResolvedValue(null);

    await expect(service.getEvent('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports an event that does not exist, or cannot be shown, as not found', async () => {
    const { repository, service } = setup();
    repository.getShowableEventById.mockResolvedValue(null);

    await expect(service.getEventDetail('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('a group-only event (F-07.2)', () => {
    const groupOnly = { visibility: 'GROUP_ONLY' } as EventDetail;
    const groupFacts: EventFacts = {
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'GROUP_ONLY',
      groupId: 'g1',
      startAt: inAnHour(),
      endAt: inAnHour(),
      approvalMode: 'MANUAL',
      organizerIds: ['organizer'],
      freeSpots: 3,
      isHidden: false,
    };
    const viewer = { id: 'u2' } as Identity;

    it('shows a public event to a visitor without asking the group', async () => {
      const { repository, groups, service } = setup();
      const event = { visibility: 'PUBLIC' } as EventDetail;
      repository.getShowableEventById.mockResolvedValue(event);

      await expect(service.getEventDetail('e1')).resolves.toBe(event);
      expect(groups.getMemberRole).not.toHaveBeenCalled();
    });

    it('shows it to a member of the group', async () => {
      const { repository, groups, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);
      repository.isInvolvedIn.mockResolvedValue(false);
      groups.getMemberRole.mockResolvedValue('MEMBER');

      await expect(service.getEventDetail('e1', viewer)).resolves.toBe(
        groupOnly,
      );
      expect(groups.getMemberRole).toHaveBeenCalledWith('g1', 'u2');
    });

    it('shows it to someone who left the group but holds a seat', async () => {
      const { repository, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);
      repository.isInvolvedIn.mockResolvedValue(true);

      await expect(service.getEventDetail('e1', viewer)).resolves.toBe(
        groupOnly,
      );
      expect(repository.isInvolvedIn).toHaveBeenCalledWith('e1', 'u2');
    });

    it('shows it to its organizer', async () => {
      const { repository, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);

      await expect(
        service.getEventDetail('e1', { id: 'organizer' } as Identity),
      ).resolves.toBe(groupOnly);
    });

    it.each([
      ['a visitor', undefined],
      ['someone outside the group', viewer],
    ])('hides it from %s as not found', async (_name, who) => {
      const { repository, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);
      repository.isInvolvedIn.mockResolvedValue(false);

      await expect(service.getEventDetail('e1', who)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('loads the facts once for the organizers of an event a member may report', async () => {
      const { repository, groups, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);
      repository.isInvolvedIn.mockResolvedValue(false);
      groups.getMemberRole.mockResolvedValue('MEMBER');

      await expect(
        service.getVisibleEventOrganizerIds('e1', viewer),
      ).resolves.toEqual(['organizer']);
      expect(repository.getEventFacts).toHaveBeenCalledTimes(1);
    });

    it('gives its seat facts to a member only', async () => {
      const { repository, groups, service } = setup();
      const seatFacts = { ...groupFacts, hasSeat: false };
      repository.getShowableEventSeatFacts.mockResolvedValue(seatFacts);
      repository.isInvolvedIn.mockResolvedValue(false);

      await expect(
        service.getVisibleEventSeatFacts('e1', 'u2'),
      ).resolves.toBeNull();

      groups.getMemberRole.mockResolvedValue('MEMBER');
      await expect(service.getVisibleEventSeatFacts('e1', 'u2')).resolves.toBe(
        seatFacts,
      );
    });
  });

  describe('getGroupEvents (F-07.2)', () => {
    const page = { items: [], total: 0 };
    const now = new Date('2030-01-01T12:00:00Z');

    it('gives a member the group-only events too', async () => {
      const { repository, groups, service } = setup();
      groups.getMemberRole.mockResolvedValue('MEMBER');
      repository.getGroupEvents.mockResolvedValue(page);

      await expect(
        service.getGroupEvents('g1', { id: 'u1' } as Identity, 'past', 10, now),
      ).resolves.toBe(page);
      expect(repository.getGroupEvents).toHaveBeenCalledWith(
        'g1',
        {
          period: 'past',
          visibilities: ['PUBLIC', 'GROUP_ONLY'],
          now,
          hiddenOrganizerIds: [],
        },
        { limit: GROUP_EVENTS_PAGE_SIZE, offset: 10 },
      );
      expect(groups.assertPublicGroup).not.toHaveBeenCalled();
    });

    it('shows the events of a group that decides on requests only as a number', async () => {
      const { repository, groups, service } = setup();
      groups.assertPublicGroup.mockResolvedValue({
        approvalMode: 'APPROVAL',
      } as Awaited<ReturnType<typeof groups.assertPublicGroup>>);
      repository.countGroupEvents.mockResolvedValue(5);

      for (const period of ['upcoming', 'past'] as const) {
        await expect(
          service.getGroupEvents('g1', undefined, period, 0, now),
        ).resolves.toEqual({ items: [], total: 0, hiddenCount: 5 });
      }
      expect(repository.getGroupEvents).not.toHaveBeenCalled();
    });

    it('gives anyone else the upcoming public events of a public group', async () => {
      const { repository, groups, service } = setup();
      groups.assertPublicGroup.mockResolvedValue({
        approvalMode: 'OPEN',
      } as Awaited<ReturnType<typeof groups.assertPublicGroup>>);
      repository.getGroupEvents.mockResolvedValue(page);

      await service.getGroupEvents('g1', undefined, 'upcoming', 0, now);

      expect(groups.assertPublicGroup).toHaveBeenCalledWith('g1', undefined);
      expect(repository.getGroupEvents).toHaveBeenCalledWith(
        'g1',
        {
          period: 'upcoming',
          visibilities: ['PUBLIC'],
          now,
          hiddenOrganizerIds: [],
        },
        { limit: GROUP_EVENTS_PAGE_SIZE, offset: 0 },
      );
    });

    it('gives a non-member the public past events and only the count of the group-only ones', async () => {
      const { repository, groups, service } = setup();
      groups.assertPublicGroup.mockResolvedValue({
        approvalMode: 'OPEN',
      } as Awaited<ReturnType<typeof groups.assertPublicGroup>>);
      repository.getGroupEvents.mockResolvedValue(page);
      repository.countGroupEvents.mockResolvedValue(3);

      await expect(
        service.getGroupEvents('g1', { id: 'u1' } as Identity, 'past', 0, now),
      ).resolves.toEqual({ ...page, hiddenCount: 3 });
      expect(groups.assertPublicGroup).toHaveBeenCalled();
      expect(repository.getGroupEvents).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({ period: 'past', visibilities: ['PUBLIC'] }),
        { limit: GROUP_EVENTS_PAGE_SIZE, offset: 0 },
      );
      expect(repository.countGroupEvents).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({ visibilities: ['GROUP_ONLY'] }),
      );
    });

    it('answers not found to a non-member asking for the past of a group without a public page', async () => {
      const { repository, groups, service } = setup();
      groups.assertPublicGroup.mockRejectedValue(new NotFoundException());

      await expect(
        service.getGroupEvents('g1', { id: 'u1' } as Identity, 'past', 0, now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getGroupEvents).not.toHaveBeenCalled();
    });

    it('answers not found for a group without a public page', async () => {
      const { repository, groups, service } = setup();
      groups.assertPublicGroup.mockRejectedValue(new NotFoundException());

      await expect(
        service.getGroupEvents('g1', undefined, 'upcoming', 0, now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getGroupEvents).not.toHaveBeenCalled();
    });
  });

  // #232: the people watching a full event hear when a seat frees up.
  describe('notifyIfSpotFreed', () => {
    const full: EventFacts = {
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: new Date(inAnHour().getTime() + 3600 * 1000),
      approvalMode: 'MANUAL',
      organizerIds: ['organizer', 'co-organizer'],
      freeSpots: 1,
      isHidden: false,
    };
    const freed = { freeSpotsBefore: 0, freeSpotsAfter: 1 };

    const watching = (
      watcherIds: string[],
      facts: EventFacts = full,
    ): ReturnType<typeof setup> => {
      const context = setup();
      context.repository.getEventFacts.mockResolvedValue(facts);
      context.repository.getFreeSpotWatcherIds.mockResolvedValue(watcherIds);
      return context;
    };

    it('tells everyone watching when the full event gets a free seat', async () => {
      const { notifications, service } = watching(['w1', 'w2']);

      await service.notifyIfSpotFreed('e1', freed, { id: 'leaver' });

      expect(notifications.notifySpotAvailable).toHaveBeenCalledTimes(1);
      expect(notifications.notifySpotAvailable).toHaveBeenCalledWith({
        event: full,
        watcherIds: ['w1', 'w2'],
        freedBy: { id: 'leaver' },
      });
    });

    it.each([
      ['more seats free up on an event that has one', 1, 3],
      ['the event stays full', 0, 0],
      ['a seat is taken', 1, 0],
    ])('tells nobody when %s', async (_, freeSpotsBefore, freeSpotsAfter) => {
      const { repository, notifications, service } = watching(['w1']);

      await service.notifyIfSpotFreed(
        'e1',
        { freeSpotsBefore, freeSpotsAfter },
        null,
      );

      expect(repository.getFreeSpotWatcherIds).not.toHaveBeenCalled();
      expect(notifications.notifySpotAvailable).not.toHaveBeenCalled();
    });

    it.each<[string, Partial<EventFacts>]>([
      ['cancelled', { status: 'CANCELLED' }],
      ['hidden by an administrator', { isHidden: true }],
      ['started', { startAt: new Date(NOW - 1000) }],
    ])('tells nobody about an event that is %s', async (_, change) => {
      const { notifications, service } = watching(['w1'], {
        ...full,
        ...change,
      });

      await service.notifyIfSpotFreed('e1', freed, null, new Date(NOW));

      expect(notifications.notifySpotAvailable).not.toHaveBeenCalled();
    });

    // The repository already leaves out people with a seat or a waiting or
    // rejected request; the service asks it for this event and adds nobody.
    it('tells only the watchers the repository finds for the event', async () => {
      const { repository, notifications, service } = watching(['w1']);

      await service.notifyIfSpotFreed('e1', freed, null);

      expect(repository.getFreeSpotWatcherIds).toHaveBeenCalledWith('e1');
      expect(notifications.notifySpotAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ watcherIds: ['w1'] }),
      );
    });

    it('leaves out whoever freed the seat and the organizers', async () => {
      const { notifications, service } = watching([
        'leaver',
        'co-organizer',
        'w1',
      ]);

      await service.notifyIfSpotFreed('e1', freed, { id: 'leaver' });

      expect(notifications.notifySpotAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ watcherIds: ['w1'] }),
      );
    });

    it('leaves out a watcher blocked from an organizer (#239)', async () => {
      const repository = mock<EventRepository>();
      repository.getEventFacts.mockResolvedValue(full);
      repository.getFreeSpotWatcherIds.mockResolvedValue(['w1', 'blocked']);
      const notifications = mock<NotificationsService>();
      const blocks = mock<UserBlockVisibility>();
      blocks.hiddenFor.mockImplementation((userId) =>
        Promise.resolve(userId === 'blocked' ? ['co-organizer'] : []),
      );
      const service = new EventsService(
        repository,
        mock<ActivitiesService>(),
        mock<CancellationReasonsService>(),
        notifications,
        mock<GroupsService>(),
        blocks,
      );

      await service.notifyIfSpotFreed('e1', freed, null);

      expect(notifications.notifySpotAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ watcherIds: ['w1'] }),
      );
    });

    it('leaves out a watcher who left the group of a group-only event', async () => {
      const { repository, groups, notifications, service } = watching(
        ['member', 'gone'],
        { ...full, visibility: 'GROUP_ONLY', groupId: 'g1' },
      );
      groups.getMemberRole.mockImplementation((_groupId, userId) =>
        Promise.resolve(userId === 'member' ? 'MEMBER' : null),
      );
      repository.isInvolvedIn.mockResolvedValue(false);

      await service.notifyIfSpotFreed('e1', freed, null);

      expect(notifications.notifySpotAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ watcherIds: ['member'] }),
      );
    });

    // ADR-0015: the change is saved; a missing notification is the worst case.
    it('never fails the change that freed the seat', async () => {
      const { repository, notifications, service } = watching([]);
      repository.getFreeSpotWatcherIds.mockRejectedValue(new Error('down'));
      const logged = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.notifyIfSpotFreed('e1', freed, null),
      ).resolves.toBeUndefined();
      expect(notifications.notifySpotAvailable).not.toHaveBeenCalled();
      expect(logged).toHaveBeenCalled();
      logged.mockRestore();
    });
  });

  describe('updateEvent', () => {
    const organizer = { id: 'u1' } as Identity;

    it('saves the changes of the organizer', async () => {
      const { repository, service } = setup();
      const event = anEvent();
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({
        ok: true,
        event,
        freeSpotsBefore: event.freeSpots,
      });
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

    // F-09.3, ADR-0015: the approved participants hear about a moved time or
    // place; the people waiting for a decision do not, they have no seat yet.
    it('tells the approved participants when the time or the place moved', async () => {
      const { repository, notifications, service } = setup();
      const event = anEvent();
      const moved = anEvent({
        startAt: new Date(event.startAt.getTime() + 3600 * 1000),
      });
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({
        ok: true,
        event: moved,
        freeSpotsBefore: moved.freeSpots,
      });
      repository.getEventAudience.mockResolvedValue({
        participantIds: ['p1', 'p2'],
        applicantIds: ['a1'],
      });

      await service.updateEvent(organizer, 'e1', input());

      expect(notifications.notifyEventChanged).toHaveBeenCalledWith({
        event: moved,
        changes: ['TIME'],
        participantIds: ['p1', 'p2'],
        changedBy: organizer,
      });
    });

    // #232: a larger maximum, or fewer seats taken outside the app.
    it('tells the watchers when the edit frees a seat on a full event', async () => {
      const { repository, notifications, service } = setup();
      const event = anEvent({ freeSpots: 0 });
      const larger = anEvent({ maxParticipants: 14, freeSpots: 2 });
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({
        ok: true,
        event: larger,
        freeSpotsBefore: 0,
      });
      repository.getEventFacts.mockResolvedValue({
        id: 'e1',
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        groupId: null,
        startAt: larger.startAt,
        endAt: larger.endAt,
        approvalMode: 'MANUAL',
        organizerIds: ['u1'],
        freeSpots: 2,
        isHidden: false,
      });
      repository.getFreeSpotWatcherIds.mockResolvedValue(['w1']);

      await service.updateEvent(organizer, 'e1', {
        ...input(),
        maxParticipants: 14,
      });

      expect(notifications.notifySpotAvailable).toHaveBeenCalledWith(
        expect.objectContaining({ watcherIds: ['w1'], freedBy: organizer }),
      );
    });

    it('tells nobody about an edit that kept the time and the place', async () => {
      const { repository, notifications, service } = setup();
      const event = anEvent();
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({
        ok: true,
        event: { ...event, title: 'Páteční florbal' },
        freeSpotsBefore: event.freeSpots,
      });

      await service.updateEvent(organizer, 'e1', input());

      expect(notifications.notifyEventChanged).not.toHaveBeenCalled();
      expect(repository.getEventAudience).not.toHaveBeenCalled();
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
      repository.updateEvent.mockResolvedValue({
        ok: true,
        event,
        freeSpotsBefore: event.freeSpots,
      });

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          venueType: 'ONLINE',
          location: undefined,
        }),
      ).resolves.toEqual(event);
    });

    it('refuses an address sent as null for an event at a place', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          location: null as unknown as undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('refuses an address for an online event', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ venueType: 'ONLINE', location: null }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          venueType: 'ONLINE',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
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

    // F-09.3, ADR-0015: both the people with a seat and the ones still waiting.
    it('tells the participants and the waiting applicants', async () => {
      const { repository, notifications, service } = setup();
      const cancelled = anEvent({ status: 'CANCELLED' });
      repository.getEventById.mockResolvedValue(anEvent());
      repository.cancelEvent.mockResolvedValue({ ok: true, event: cancelled });
      repository.getEventAudience.mockResolvedValue({
        participantIds: ['p1'],
        applicantIds: ['a1'],
      });

      await service.cancelEvent(organizer, 'e1', data);

      expect(notifications.notifyEventCancelled).toHaveBeenCalledWith({
        event: cancelled,
        participantIds: ['p1'],
        applicantIds: ['a1'],
        cancelledBy: organizer,
      });
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

  describe('getOrganizedEvent', () => {
    const facts: EventFacts = {
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: new Date(inAnHour().getTime() + 3600 * 1000),
      approvalMode: 'MANUAL',
      organizerIds: ['organizer', 'co-organizer'],
      freeSpots: 3,
      isHidden: false,
    };

    it.each(['organizer', 'co-organizer'])(
      'gives the event to its %s',
      async (id) => {
        const { repository, service } = setup();
        repository.getEventFacts.mockResolvedValue(facts);

        await expect(
          service.getOrganizedEvent('e1', { id } as Identity),
        ).resolves.toEqual(facts);
        expect(repository.getEventFacts).toHaveBeenCalledWith('e1');
      },
    );

    // 404, not 403: a stranger must not learn the event is there.
    it('answers 404 to someone who does not organize it', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);

      await expect(
        service.getOrganizedEvent('e1', { id: 'stranger' } as Identity),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers 404 for an event that does not exist', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(null);

      await expect(
        service.getOrganizedEvent('e1', { id: 'organizer' } as Identity),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getParticipantInfo', () => {
    const facts = (
      overrides: Partial<EventSeatFacts> = {},
    ): EventSeatFacts => ({
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: inAnHour(),
      approvalMode: 'MANUAL',
      organizerIds: ['u1'],
      freeSpots: 3,
      isHidden: false,
      hasSeat: false,
      ...overrides,
    });
    const info = {
      venueType: 'PLACE' as const,
      location: null,
      organizerName: 'Jana',
      externalChatUrl: 'https://chat.whatsapp.com/abc',
      contact: '+420 777 123 456',
    };

    it('gives the contacts to a person holding a seat', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(
        facts({ hasSeat: true }),
      );
      repository.getParticipantInfo.mockResolvedValue(info);

      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).resolves.toBe(info);
    });

    it('gives them to the organizer without a seat', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(facts());
      repository.getParticipantInfo.mockResolvedValue(info);

      await expect(
        service.getParticipantInfo({ id: 'u1' } as Identity, 'e1'),
      ).resolves.toBe(info);
    });

    it('refuses anyone else and never reads the contacts', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(facts());

      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.getParticipantInfo).not.toHaveBeenCalled();
    });

    it('keeps the contacts of a cancelled or finished event to itself', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(
        facts({ hasSeat: true, status: 'CANCELLED' }),
      );
      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      repository.getShowableEventSeatFacts.mockResolvedValue(
        facts({ hasSeat: true, endAt: new Date(Date.now() - 1000) }),
      );
      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.getParticipantInfo).not.toHaveBeenCalled();
    });

    it('says not found for an event that is not public', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(null);

      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getManagedEvent', () => {
    const facts = (organizerIds: string[]): EventFacts => ({
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: new Date(inAnHour().getTime() + 3600 * 1000),
      approvalMode: 'MANUAL',
      organizerIds,
      freeSpots: 8,
      isHidden: false,
    });

    it('gives a co-organizer the whole event', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts(['u1', 'co']));
      const event = anEvent();
      repository.getEventById.mockResolvedValue(event);

      await expect(
        service.getManagedEvent({ id: 'co' } as Identity, 'e1'),
      ).resolves.toEqual(event);
    });

    it('answers 404 to someone who does not organize it', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts(['u1']));

      await expect(
        service.getManagedEvent({ id: 'stranger' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getEventById).not.toHaveBeenCalled();
    });
  });

  describe('updateExternalOccupiedSpots', () => {
    const organizer = { id: 'u1' } as Identity;
    const facts: EventFacts = {
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: new Date(inAnHour().getTime() + 3600 * 1000),
      approvalMode: 'MANUAL',
      organizerIds: ['u1'],
      freeSpots: 2,
      isHidden: false,
    };
    const violationsOf = async (
      promise: Promise<unknown>,
    ): Promise<string[]> => {
      const error = await promise.catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(BadRequestException);
      return (
        (error as BadRequestException).getResponse() as {
          violations: string[];
        }
      ).violations;
    };

    it('saves the new number and notifies nobody', async () => {
      const { repository, notifications, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(
        anEvent({ approvedCount: 6, externalOccupiedSpots: 4 }),
      );
      const saved = anEvent({ approvedCount: 6, externalOccupiedSpots: 6 });
      repository.updateExternalOccupiedSpots.mockResolvedValue({
        ok: true,
        event: saved,
        freeSpotsBefore: saved.freeSpots,
      });

      await expect(
        service.updateExternalOccupiedSpots(organizer, 'e1', 6),
      ).resolves.toBe(saved);
      expect(repository.updateExternalOccupiedSpots).toHaveBeenCalledWith(
        'e1',
        6,
        expect.any(Date),
      );
      expect(notifications.notifyEventChanged).not.toHaveBeenCalled();
    });

    // #232: fewer seats taken outside the app free one on a full event.
    it('tells the watchers when fewer outside seats free one up', async () => {
      const { repository, notifications, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(
        anEvent({ approvedCount: 6, externalOccupiedSpots: 6, freeSpots: 0 }),
      );
      repository.updateExternalOccupiedSpots.mockResolvedValue({
        ok: true,
        event: anEvent({
          approvedCount: 6,
          externalOccupiedSpots: 4,
          freeSpots: 2,
        }),
        freeSpotsBefore: 0,
      });
      repository.getFreeSpotWatcherIds.mockResolvedValue(['w1']);

      await service.updateExternalOccupiedSpots(organizer, 'e1', 4);

      expect(notifications.notifySpotAvailable).toHaveBeenCalledWith({
        event: facts,
        watcherIds: ['w1'],
        freedBy: organizer,
      });
    });

    it('refuses more than the maximum leaves and saves nothing', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(
        anEvent({ approvedCount: 6, externalOccupiedSpots: 4 }),
      );

      await expect(
        violationsOf(service.updateExternalOccupiedSpots(organizer, 'e1', 7)),
      ).resolves.toEqual(['MAX_BELOW_OCCUPIED']);
      expect(repository.updateExternalOccupiedSpots).not.toHaveBeenCalled();
    });

    it('refuses an event that has started', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(
        anEvent({ startAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        violationsOf(service.updateExternalOccupiedSpots(organizer, 'e1', 1)),
      ).resolves.toEqual(['EVENT_NOT_CHANGEABLE']);
    });

    // A seat approved between the read and the write.
    it('reports what the guarded write refused', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(anEvent());
      repository.updateExternalOccupiedSpots.mockResolvedValue({
        ok: false,
        violation: 'MAX_BELOW_OCCUPIED',
      });

      await expect(
        violationsOf(service.updateExternalOccupiedSpots(organizer, 'e1', 8)),
      ).resolves.toEqual(['MAX_BELOW_OCCUPIED']);
    });

    it('answers 404 to someone who does not organize it', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);

      await expect(
        service.updateExternalOccupiedSpots(
          { id: 'stranger' } as Identity,
          'e1',
          1,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateExternalOccupiedSpots).not.toHaveBeenCalled();
    });
  });

  // #238: the administration sees any event, hidden and drafts too, so the
  // only "not found" is an event that does not exist.
  describe('getEventForAdministration', () => {
    it('is not found for an unknown event', async () => {
      const { repository, service } = setup();
      repository.getAdministrationDetail.mockResolvedValue(null);

      await expect(
        service.getEventForAdministration('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('passes the search and page to the repository', async () => {
      const { repository, service } = setup();
      repository.listForAdministration.mockResolvedValue({
        items: [],
        total: 0,
      });

      await service.listEventsForAdministration({
        search: 'florbal',
        offset: 20,
      });

      expect(repository.listForAdministration).toHaveBeenCalledWith({
        search: 'florbal',
        offset: 20,
      });
    });
  });
});

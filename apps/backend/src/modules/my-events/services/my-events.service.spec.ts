import { EventInterestsService } from '@/modules/event-interest/services/event-interests.service';
import { EventFilter, EventListItem } from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { EventApplicationFacts } from '@/modules/participation-request/domain/participation-request';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { RatingsService } from '@/modules/rating/services/ratings.service';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { MyEventsService } from './my-events.service';

const user = { id: 'u1' } as Identity;
const now = new Date('2030-01-01T12:00:00Z');
const page = { limit: 20, offset: 0 };
const filter: EventFilter = { activityIds: [] };

const anItem = (id: string): EventListItem =>
  ({ id, startAt: new Date('2030-01-02T10:00:00Z') }) as EventListItem;

const facts = (
  eventId: string,
  override: Partial<EventApplicationFacts> = {},
): EventApplicationFacts => ({
  eventId,
  eventStatus: 'PUBLISHED',
  seat: null,
  requests: ['PENDING'],
  ...override,
});

describe('MyEventsService', () => {
  let events: MockProxy<EventsService>;
  let requests: MockProxy<ParticipationRequestsService>;
  let ratings: MockProxy<RatingsService>;
  let interests: MockProxy<EventInterestsService>;
  let service: MyEventsService;

  beforeEach(() => {
    events = mock<EventsService>();
    requests = mock<ParticipationRequestsService>();
    ratings = mock<RatingsService>();
    ratings.getEventsToRateOrganizer.mockResolvedValue([]);
    ratings.getParticipantsToRate.mockResolvedValue(new Map());
    interests = mock<EventInterestsService>();
    service = new MyEventsService(events, requests, ratings, interests);
  });

  describe('getApplications', () => {
    it('pairs each event with its status and keeps the order of the page', async () => {
      requests.getMyApplicationFacts.mockResolvedValue({
        items: [
          facts('soon', { seat: 'APPROVED', requests: ['APPROVED'] }),
          facts('cancelled', { eventStatus: 'CANCELLED' }),
          facts('late'),
        ],
        total: 45,
      });
      // The repository returns the cards in no particular order.
      events.getListItemsByIds.mockResolvedValue([
        anItem('late'),
        anItem('soon'),
        anItem('cancelled'),
      ]);

      const result = await service.getApplications(user, page, filter, now);

      expect(result.total).toBe(45);
      expect(result.nextOffset).toBe(3);
      expect(
        result.items.map(({ event, status }) => [event.id, status]),
      ).toEqual([
        ['soon', 'APPROVED'],
        ['cancelled', 'EVENT_CANCELLED'],
        ['late', 'PENDING'],
      ]);
      expect(requests.getMyApplicationFacts).toHaveBeenCalledWith(
        user,
        page,
        filter,
        now,
      );
    });

    // #234: the rating rules say which events; the overview only marks them.
    it('marks the events whose organizer the person may still rate', async () => {
      requests.getMyApplicationFacts.mockResolvedValue({
        items: [
          facts('played', { seat: 'APPROVED', requests: ['APPROVED'] }),
          facts('rated', { seat: 'APPROVED', requests: ['APPROVED'] }),
        ],
        total: 2,
      });
      events.getListItemsByIds.mockResolvedValue([
        anItem('played'),
        anItem('rated'),
      ]);
      ratings.getEventsToRateOrganizer.mockResolvedValue(['played']);

      const result = await service.getApplications(user, page, filter, now);

      expect(
        result.items.map(({ event, canRateOrganizer }) => [
          event.id,
          canRateOrganizer,
        ]),
      ).toEqual([
        ['played', true],
        ['rated', false],
      ]);
      expect(ratings.getEventsToRateOrganizer).toHaveBeenCalledWith(
        user,
        ['played', 'rated'],
        now,
      );
    });

    it('counts the next offset from the rows passed, not the rows shown', async () => {
      requests.getMyApplicationFacts.mockResolvedValue({
        items: [facts('gone'), facts('last')],
        total: 22,
      });
      events.getListItemsByIds.mockResolvedValue([anItem('last')]);

      const result = await service.getApplications(
        user,
        { limit: 2, offset: 20 },
        filter,
        now,
      );

      expect(result.items).toHaveLength(1);
      expect(result.nextOffset).toBeNull();
    });

    it('leaves out events without an application worth showing', async () => {
      requests.getMyApplicationFacts.mockResolvedValue({
        items: [facts('none', { requests: [] })],
        total: 1,
      });
      events.getListItemsByIds.mockResolvedValue([anItem('none')]);

      const result = await service.getApplications(user, page, filter, now);

      expect(result.items).toEqual([]);
    });
  });

  describe('getHosted', () => {
    it('returns the page of events the user organizes', async () => {
      events.getOrganizedEvents.mockResolvedValue({
        items: [anItem('mine')],
        total: 1,
      });

      await expect(service.getHosted(user, page, filter, now)).resolves.toEqual(
        { items: [{ ...anItem('mine'), participantsToRate: 0 }], total: 1 },
      );
      expect(events.getOrganizedEvents).toHaveBeenCalledWith(
        user,
        page,
        filter,
        now,
      );
    });

    // #235: the rating rules, not this overview, decide whom they may rate.
    it('says how many participants the organizer may still rate, page by page', async () => {
      events.getOrganizedEvents.mockResolvedValue({
        items: [anItem('over'), anItem('soon')],
        total: 2,
      });
      ratings.getParticipantsToRate.mockResolvedValue(new Map([['over', 3]]));

      const hosted = await service.getHosted(user, page, filter, now);

      expect(
        hosted.items.map(({ id, participantsToRate }) => [
          id,
          participantsToRate,
        ]),
      ).toEqual([
        ['over', 3],
        ['soon', 0],
      ]);
      expect(ratings.getParticipantsToRate).toHaveBeenCalledWith(
        user,
        ['over', 'soon'],
        now,
      );
    });

    it('passes the filter on as it came', async () => {
      const narrowed: EventFilter = {
        activityIds: ['a1'],
        search: 'florbal',
        location: 'Praha',
        dateFrom: '2030-01-01',
        dateTo: '2030-01-31',
      };
      events.getOrganizedEvents.mockResolvedValue({ items: [], total: 0 });

      await service.getHosted(user, page, narrowed, now);

      expect(events.getOrganizedEvents).toHaveBeenCalledWith(
        user,
        page,
        narrowed,
        now,
      );
    });
  });

  // #231
  describe('getInterested', () => {
    const anEvent = (
      id: string,
      endAt: string,
      { takenCount = 4, maxParticipants = 4 } = {},
    ): EventListItem =>
      ({
        id,
        startAt: new Date(new Date(endAt).getTime() - 2 * 3600 * 1000),
        endAt: new Date(endAt),
        takenCount,
        maxParticipants,
      }) as EventListItem;

    beforeEach(() => {
      interests.getWatchableEventIds.mockResolvedValue(new Set());
    });

    it('keeps the order of the page and tells where each event stands', async () => {
      interests.getMyPage.mockResolvedValue({
        items: [
          { eventId: 'soon', status: 'PUBLISHED', watchesFreeSpot: false },
          { eventId: 'ended', status: 'PUBLISHED', watchesFreeSpot: false },
          { eventId: 'cancelled', status: 'CANCELLED', watchesFreeSpot: false },
          { eventId: 'finished', status: 'FINISHED', watchesFreeSpot: false },
        ],
        total: 30,
      });
      // The repository returns the cards in no particular order.
      events.getListItemsByIds.mockResolvedValue([
        anEvent('finished', '2029-12-01T10:00:00Z'),
        anEvent('cancelled', '2030-01-05T10:00:00Z'),
        anEvent('soon', '2030-01-02T10:00:00Z'),
        // Over, though nobody has closed it yet.
        anEvent('ended', '2030-01-01T11:00:00Z'),
      ]);

      const result = await service.getInterested(user, page, filter, now);

      expect(result.items.map(({ id, state }) => [id, state])).toEqual([
        ['soon', 'UPCOMING'],
        ['ended', 'PAST'],
        ['cancelled', 'CANCELLED'],
        ['finished', 'PAST'],
      ]);
      expect(result.total).toBe(30);
      expect(interests.getMyPage).toHaveBeenCalledWith(user, page, filter, now);
    });

    // #232: whether each is watched, and whether it may be: only a full
    // event that has not started is even asked about.
    it('tells which events are watched and which may be', async () => {
      interests.getMyPage.mockResolvedValue({
        items: [
          { eventId: 'watched', status: 'PUBLISHED', watchesFreeSpot: true },
          { eventId: 'full', status: 'PUBLISHED', watchesFreeSpot: false },
          { eventId: 'started', status: 'PUBLISHED', watchesFreeSpot: false },
          { eventId: 'open', status: 'PUBLISHED', watchesFreeSpot: false },
        ],
        total: 4,
      });
      events.getListItemsByIds.mockResolvedValue([
        anEvent('watched', '2030-01-03T10:00:00Z'),
        anEvent('full', '2030-01-04T10:00:00Z'),
        anEvent('started', '2030-01-01T13:00:00Z'),
        anEvent('open', '2030-01-05T10:00:00Z', { takenCount: 2 }),
      ]);
      interests.getWatchableEventIds.mockResolvedValue(new Set(['full']));

      const result = await service.getInterested(user, page, filter, now);

      expect(
        result.items.map(({ id, watchesFreeSpot, canWatchFreeSpot }) => [
          id,
          watchesFreeSpot,
          canWatchFreeSpot,
        ]),
      ).toEqual([
        ['watched', true, false],
        ['full', false, true],
        ['started', false, false],
        ['open', false, false],
      ]);
      expect(interests.getWatchableEventIds).toHaveBeenCalledWith(
        user,
        ['watched', 'full'],
        now,
      );
    });

    it('drops an event that disappeared between the two queries', async () => {
      interests.getMyPage.mockResolvedValue({
        items: [
          { eventId: 'gone', status: 'PUBLISHED', watchesFreeSpot: false },
        ],
        total: 1,
      });
      events.getListItemsByIds.mockResolvedValue([]);

      const result = await service.getInterested(user, page, filter, now);

      expect(result.items).toEqual([]);
    });
  });

  // The same rule between fields as the public list (#177).
  describe('a date range that ends before it starts', () => {
    const reversed: EventFilter = {
      activityIds: [],
      dateFrom: '2030-02-01',
      dateTo: '2030-01-01',
    };

    it('is refused for the applications', async () => {
      await expect(
        service.getApplications(user, page, reversed, now),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(requests.getMyApplicationFacts).not.toHaveBeenCalled();
    });

    it('is refused for the hosted events', async () => {
      await expect(
        service.getHosted(user, page, reversed, now),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(events.getOrganizedEvents).not.toHaveBeenCalled();
    });

    it('is refused for the saved events', async () => {
      await expect(
        service.getInterested(user, page, reversed, now),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(interests.getMyPage).not.toHaveBeenCalled();
    });
  });
});

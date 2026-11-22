import {
  EventListItem,
  LandingEventSelection,
} from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { Group, TrendingGroup } from '@/modules/group/domain/group';
import { GroupsService } from '@/modules/group/services/groups.service';
import { Onboarding } from '@/modules/onboarding/domain/onboarding';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import { RatingsService } from '@/modules/rating/services/ratings.service';
import { Identity } from '@/shared/auth/domain/identity';
import { mock, MockProxy } from 'jest-mock-extended';
import { LandingService } from './landing.service';

const user = { id: 'me' } as Identity;
// Thursday 19 Nov 2026, 16:00 in Prague.
const now = new Date('2026-11-19T15:00:00Z');

const anItem = (id: string): EventListItem => ({ id }) as EventListItem;
const aGroup = (id: string): Group => ({ id, name: id }) as Group;

const profile = (override: Partial<Onboarding> = {}): Onboarding =>
  ({
    interests: [],
    address: null,
    travelRadiusKm: null,
    ...override,
  }) as Onboarding;

const home = {
  street: 'Ulice 1',
  city: 'Brno',
  postalCode: '60200',
  country: 'CZ',
  latitude: 49.19,
  longitude: 16.6,
};

describe('LandingService', () => {
  let events: MockProxy<EventsService>;
  let groups: MockProxy<GroupsService>;
  let friendships: MockProxy<FriendshipService>;
  let onboarding: MockProxy<OnboardingService>;
  let ratings: MockProxy<RatingsService>;
  let service: LandingService;
  // The selections the event module was asked, by what they narrow.
  let asked: LandingEventSelection[];

  beforeEach(() => {
    events = mock<EventsService>();
    groups = mock<GroupsService>();
    friendships = mock<FriendshipService>();
    onboarding = mock<OnboardingService>();
    ratings = mock<RatingsService>();
    asked = [];
    events.getLandingEventIds.mockImplementation((selections) => {
      asked = selections;
      return Promise.resolve(selections.map(() => []));
    });
    events.getLandingCities.mockResolvedValue([
      { city: 'Praha', eventCount: 12 },
      { city: 'Brno', eventCount: 4 },
    ]);
    events.getListItemsByIds.mockImplementation((ids) =>
      Promise.resolve(ids.map(anItem)),
    );
    events.getViewerStates.mockResolvedValue(new Map());
    events.getAttendees.mockResolvedValue([]);
    events.getOrganizerIds.mockResolvedValue(new Map());
    groups.listTrendingGroups.mockResolvedValue([]);
    groups.listGroupsForActivities.mockResolvedValue([]);
    friendships.listFriendsSharingUpcomingEvents.mockResolvedValue([]);
    onboarding.getOnboardingOf.mockResolvedValue(profile());
    ratings.getPublicOrganizerScores.mockResolvedValue(new Map());
    service = new LandingService(
      events,
      groups,
      friendships,
      onboarding,
      ratings,
    );
  });

  // Answers the event rows in the order they were asked.
  const answer = (
    byRow: (selection: LandingEventSelection) => string[],
  ): void => {
    events.getLandingEventIds.mockImplementation((selections) => {
      asked = selections;
      return Promise.resolve(selections.map(byRow));
    });
  };

  describe('a visitor', () => {
    it('gets the public rows only, in the order of the page', async () => {
      answer(() => ['e1']);
      groups.listTrendingGroups.mockResolvedValue([
        { ...aGroup('g1'), recentMemberCount: 3 } as TrendingGroup,
      ]);
      answer((selection) =>
        selection.startsBefore ? ['e1'] : selection.dateFrom ? ['e2'] : [],
      );

      const landing = await service.getLanding(undefined, {}, now);

      expect(landing.rows.map((row) => row.kind)).toEqual([
        'lastMinute',
        'trendingGroups',
        'today',
      ]);
      expect(onboarding.getOnboardingOf).not.toHaveBeenCalled();
      expect(asked.some((selection) => selection.likedBy)).toBe(false);
      expect(asked.some((selection) => selection.attendedByAnyOf)).toBe(false);
    });

    it('sees "near" in the busiest city until they pick one', async () => {
      const first = await service.getLanding(undefined, {}, now);
      expect(first.near).toEqual({ mode: 'city', city: 'Praha' });
      expect(first.cities).toHaveLength(2);

      const picked = await service.getLanding(undefined, { city: 'Brno' }, now);
      expect(picked.near).toEqual({ mode: 'city', city: 'Brno' });
      expect(asked).toContainEqual(
        expect.objectContaining({ city: 'Brno', order: 'soonest' }),
      );
    });

    it('never gets the organizer score, nor any state of their own', async () => {
      answer((selection) => (selection.order === 'top' ? ['t1'] : []));
      events.getOrganizerIds.mockResolvedValue(new Map([['t1', 'org']]));

      const landing = await service.getLanding(undefined, {}, now);

      expect(events.getOrganizerIds).not.toHaveBeenCalled();
      expect(landing.rows[0].events[0]).toMatchObject({
        id: 't1',
        organizerScore: null,
        viewerState: null,
        friends: [],
      });
    });

    it('asks last minute four hours ahead, today and the weekend in Prague', async () => {
      await service.getLanding(undefined, {}, now);

      expect(asked).toContainEqual(
        expect.objectContaining({
          startsBefore: new Date('2026-11-19T19:00:00Z'),
        }),
      );
      expect(asked).toContainEqual(
        expect.objectContaining({
          dateFrom: '2026-11-19',
          dateTo: '2026-11-19',
        }),
      );
      expect(asked).toContainEqual(
        expect.objectContaining({
          dateFrom: '2026-11-21',
          dateTo: '2026-11-22',
        }),
      );
    });
  });

  describe('a signed-in person', () => {
    it('gets "near" around the home within the travel radius', async () => {
      onboarding.getOnboardingOf.mockResolvedValue(
        profile({ address: home, travelRadiusKm: 10 }),
      );

      const landing = await service.getLanding(user, {}, now);

      expect(landing.near).toEqual({
        mode: 'radius',
        radiusKm: 10,
        city: 'Brno',
        latitude: 49.19,
        longitude: 16.6,
      });
      expect(landing.cities).toEqual([]);
      expect(events.getLandingCities).not.toHaveBeenCalled();
      expect(asked).toContainEqual(
        expect.objectContaining({
          order: 'nearest',
          around: { latitude: 49.19, longitude: 16.6, radiusKm: 10 },
        }),
      );
    });

    it('falls back to the home city without a travel radius', async () => {
      onboarding.getOnboardingOf.mockResolvedValue(profile({ address: home }));

      const landing = await service.getLanding(user, {}, now);

      expect(landing.near).toEqual({ mode: 'city', city: 'Brno' });
    });

    it('asks for liked events and for friends only when someone shares', async () => {
      await service.getLanding(user, {}, now);
      expect(asked).toContainEqual(expect.objectContaining({ likedBy: 'me' }));
      expect(asked.some((selection) => selection.attendedByAnyOf)).toBe(false);

      friendships.listFriendsSharingUpcomingEvents.mockResolvedValue([
        { id: 'f1', name: 'anna', image: null },
      ]);
      await service.getLanding(user, {}, now);
      expect(asked).toContainEqual(
        expect.objectContaining({ attendedByAnyOf: ['f1'] }),
      );
    });

    it('names only the friends who share, and shows the own state', async () => {
      friendships.listFriendsSharingUpcomingEvents.mockResolvedValue([
        { id: 'f1', name: 'anna', image: null },
      ]);
      answer((selection) => (selection.attendedByAnyOf ? ['e1'] : []));
      // The event module answers for the people it was asked about only.
      events.getAttendees.mockResolvedValue([{ eventId: 'e1', userId: 'f1' }]);
      events.getViewerStates.mockResolvedValue(new Map([['e1', 'JOINED']]));

      const landing = await service.getLanding(user, {}, now);

      expect(events.getAttendees).toHaveBeenCalledWith(['e1'], ['f1']);
      expect(landing.rows).toEqual([
        expect.objectContaining({
          kind: 'friends',
          events: [
            expect.objectContaining({
              id: 'e1',
              viewerState: 'JOINED',
              friends: [{ id: 'f1', name: 'anna', image: null }],
            }),
          ],
        }),
      ]);
    });

    it('adds the organizer score to "Top akce" only', async () => {
      answer((selection) =>
        selection.order === 'top'
          ? ['t1']
          : selection.startsBefore
            ? ['l1']
            : [],
      );
      events.getOrganizerIds.mockResolvedValue(new Map([['t1', 'org']]));
      ratings.getPublicOrganizerScores.mockResolvedValue(
        new Map([['org', { count: 5, average: 4.6 }]]),
      );

      const landing = await service.getLanding(user, {}, now);

      expect(events.getOrganizerIds).toHaveBeenCalledWith(['t1']);
      const [lastMinute, top] = landing.rows;
      expect(lastMinute.events[0].organizerScore).toBeNull();
      expect(top.events[0].organizerScore).toEqual({ count: 5, average: 4.6 });
    });

    it('offers groups of the profile activities', async () => {
      onboarding.getOnboardingOf.mockResolvedValue(
        profile({
          interests: [{ activity: { id: 'florbal' }, level: null }],
        } as Partial<Onboarding>),
      );
      groups.listGroupsForActivities.mockResolvedValue([aGroup('g1')]);

      const landing = await service.getLanding(user, {}, now);

      expect(groups.listGroupsForActivities).toHaveBeenCalledWith(
        user,
        ['florbal'],
        6,
      );
      expect(landing.rows).toEqual([
        expect.objectContaining({
          kind: 'groupsForYou',
          groups: [
            expect.objectContaining({ id: 'g1', recentMemberCount: null }),
          ],
        }),
      ]);
    });
  });

  it('keeps the other rows when one fails', async () => {
    events.getLandingEventIds.mockImplementation((selections) =>
      Promise.resolve(
        selections.map((selection) =>
          selection.startsBefore
            ? null
            : selection.order === 'top'
              ? ['t1']
              : [],
        ),
      ),
    );
    groups.listTrendingGroups.mockRejectedValue(new Error('down'));

    const landing = await service.getLanding(undefined, {}, now);

    expect(
      landing.rows.map((row) => [row.kind, row.status, row.events.length]),
    ).toEqual([
      ['lastMinute', 'error', 0],
      ['top', 'ok', 1],
      ['trendingGroups', 'error', 0],
    ]);
  });
});

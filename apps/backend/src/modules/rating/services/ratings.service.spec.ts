import {
  Rating,
  RatingEventFacts,
  SeatStatus,
} from '@/modules/rating/domain/rating';
import { RatingRepository } from '@/modules/rating/repositories/rating.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { RatingsService } from './ratings.service';

const endAt = new Date('2026-11-10T20:00:00Z');
const now = new Date('2026-11-12T10:00:00Z');

const anEvent = (
  overrides: Partial<RatingEventFacts> = {},
): RatingEventFacts => ({
  id: 'e1',
  title: 'Badminton',
  status: 'PUBLISHED',
  endAt,
  isHidden: false,
  organizerId: 'org',
  organizerName: 'Tomáš',
  coOrganizerIds: ['co'],
  ...overrides,
});

const aRating = (overrides: Partial<Rating> = {}): Rating => ({
  id: 'r1',
  eventId: 'e1',
  participantId: 'p1',
  direction: 'TO_ORGANIZER',
  authorId: 'p1',
  ratedUserId: 'org',
  stars: 5,
  comment: null,
  createdAt: now,
  ...overrides,
});

const asUser = (id: string): Identity =>
  new Identity(id, `${id}@example.com`, id, true);

const setup = ({
  event = anEvent(),
  seats = { p1: 'APPROVED' },
  hidden = [],
  blocked = [],
}: {
  event?: RatingEventFacts | null;
  seats?: Record<string, SeatStatus>;
  hidden?: string[];
  /** #65: the people the one asking blocked themselves. */
  blocked?: string[];
} = {}): {
  repository: MockProxy<RatingRepository>;
  service: RatingsService;
} => {
  const repository = mock<RatingRepository>();
  repository.getEventFacts.mockResolvedValue(event);
  repository.getSeatStatus.mockImplementation((_eventId, userId) =>
    Promise.resolve(seats[userId] ?? null),
  );
  repository.findRating.mockResolvedValue(null);
  repository.getRatingsByAuthorAt.mockResolvedValue([]);
  repository.create.mockImplementation((rating) =>
    Promise.resolve({ ...aRating(), ...rating }),
  );
  const blocks = mock<UserBlockVisibility>();
  blocks.hiddenFor.mockResolvedValue(hidden);
  blocks.blockedBy.mockResolvedValue(blocked);
  blocks.mutedFor.mockResolvedValue([...new Set([...hidden, ...blocked])]);
  return { repository, service: new RatingsService(repository, blocks) };
};

describe('RatingsService', () => {
  describe('rateOrganizer', () => {
    it('saves the rating of the main organizer, author from the session', async () => {
      const { repository, service } = setup();
      await service.rateOrganizer(
        asUser('p1'),
        'e1',
        { stars: 4, comment: 'Fajn' },
        now,
      );
      expect(repository.create).toHaveBeenCalledWith({
        eventId: 'e1',
        participantId: 'p1',
        direction: 'TO_ORGANIZER',
        authorId: 'p1',
        ratedUserId: 'org',
        stars: 4,
        comment: 'Fajn',
      });
    });

    it('does not show the event to someone who never had a seat', async () => {
      const { repository, service } = setup({ seats: {} });
      await expect(
        service.rateOrganizer(asUser('stranger'), 'e1', { stars: 5 }, now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses someone who cancelled their seat, saying why', async () => {
      const { service } = setup({ seats: { p1: 'CANCELLED' } });
      await expect(
        service.rateOrganizer(asUser('p1'), 'e1', { stars: 5 }, now),
      ).rejects.toMatchObject({
        response: { violations: ['NO_SEAT'] },
      });
    });

    it.each([
      ['hidden by an administrator', { event: anEvent({ isHidden: true }) }],
      ['of an organizer blocked from them', { hidden: ['org'] }],
      ['of a co-organizer blocked from them', { hidden: ['co'] }],
      ['missing', { event: null }],
    ])('does not show an event %s', async (_case, options) => {
      const { service } = setup(options);
      await expect(
        service.rateOrganizer(asUser('p1'), 'e1', { stars: 5 }, now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    // #65, ADR-0028: whoever blocked someone says nothing to them.
    it('does not let someone rate an organizer they blocked', async () => {
      const { repository, service } = setup({ blocked: ['org'] });
      await expect(
        service.rateOrganizer(asUser('p1'), 'e1', { stars: 1 }, now),
      ).rejects.toThrow('Organizer not found');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('refuses a second rating', async () => {
      const { repository, service } = setup();
      repository.findRating.mockResolvedValue(aRating());
      await expect(
        service.rateOrganizer(asUser('p1'), 'e1', { stars: 5 }, now),
      ).rejects.toMatchObject({ response: { violations: ['ALREADY_RATED'] } });
    });

    it('refuses the loser of a race for the same rating', async () => {
      const { repository, service } = setup();
      repository.create.mockResolvedValue(null);
      await expect(
        service.rateOrganizer(asUser('p1'), 'e1', { stars: 5 }, now),
      ).rejects.toMatchObject({ response: { violations: ['ALREADY_RATED'] } });
    });

    it('refuses after the rating period', async () => {
      const { service } = setup();
      await expect(
        service.rateOrganizer(
          asUser('p1'),
          'e1',
          { stars: 5 },
          new Date('2026-11-17T20:00:01Z'),
        ),
      ).rejects.toMatchObject({ response: { violations: ['RATING_CLOSED'] } });
    });
  });

  describe('rateParticipant', () => {
    it('saves the rating of a participant who did not come', async () => {
      const { repository, service } = setup({ seats: { p1: 'NO_SHOW' } });
      await service.rateParticipant(
        asUser('org'),
        'e1',
        'p1',
        { stars: 1, comment: 'Nepřišel' },
        now,
      );
      expect(repository.create).toHaveBeenCalledWith({
        eventId: 'e1',
        participantId: 'p1',
        direction: 'TO_PARTICIPANT',
        authorId: 'org',
        ratedUserId: 'p1',
        stars: 1,
        comment: 'Nepřišel',
      });
    });

    it('refuses a co-organizer, who can see the event', async () => {
      const { service } = setup();
      await expect(
        service.rateParticipant(asUser('co'), 'e1', 'p1', { stars: 5 }, now),
      ).rejects.toMatchObject({
        response: { violations: ['NOT_MAIN_ORGANIZER'] },
      });
    });

    it('does not show the event to a participant', async () => {
      const { service } = setup({ seats: { p1: 'APPROVED', p2: 'APPROVED' } });
      await expect(
        service.rateParticipant(asUser('p2'), 'e1', 'p1', { stars: 5 }, now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
      ['without any seat', { seats: {} }],
      ['blocked from the organizer', { hidden: ['p1'] }],
      // #65, ADR-0028: the organizer blocked them themselves.
      ['the organizer blocked', { blocked: ['p1'] }],
    ])('does not find a participant %s', async (_case, options) => {
      const { service } = setup(options);
      await expect(
        service.rateParticipant(asUser('org'), 'e1', 'p1', { stars: 5 }, now),
      ).rejects.toThrow('Participant not found');
    });

    it('refuses rating a co-organizer as a participant', async () => {
      const { service } = setup();
      await expect(
        service.rateParticipant(asUser('org'), 'e1', 'co', { stars: 5 }, now),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // #234: the overview of one's applications points to the rating page.
  describe('getEventsToRateOrganizer', () => {
    const listSetup = ({
      events,
      seats = {},
      rated = [],
      hidden = [],
      blocked = [],
    }: {
      events: RatingEventFacts[];
      seats?: Record<string, SeatStatus>;
      rated?: string[];
      hidden?: string[];
      /** #65: the people the one asking blocked themselves. */
      blocked?: string[];
    }): {
      repository: MockProxy<RatingRepository>;
      service: RatingsService;
    } => {
      const repository = mock<RatingRepository>();
      repository.getEventFactsOf.mockResolvedValue(events);
      repository.getSeatStatuses.mockResolvedValue(
        new Map(Object.entries(seats)),
      );
      repository.getOrganizerRatedEventIds.mockResolvedValue(rated);
      const blocks = mock<UserBlockVisibility>();
      blocks.hiddenFor.mockResolvedValue(hidden);
      blocks.blockedBy.mockResolvedValue(blocked);
      return { repository, service: new RatingsService(repository, blocks) };
    };

    it('keeps only the events whose organizer may be rated now', async () => {
      const { service } = listSetup({
        events: [
          anEvent({ id: 'open' }),
          anEvent({ id: 'rated' }),
          anEvent({ id: 'left' }),
          anEvent({ id: 'none' }),
          anEvent({ id: 'late', endAt: new Date('2026-11-01T20:00:00Z') }),
          anEvent({ id: 'future', endAt: new Date('2026-11-20T20:00:00Z') }),
          anEvent({ id: 'cancelled', status: 'CANCELLED' }),
          anEvent({ id: 'hidden', isHidden: true }),
          anEvent({ id: 'mine', organizerId: 'p1' }),
          anEvent({ id: 'absent' }),
        ],
        seats: {
          open: 'APPROVED',
          rated: 'APPROVED',
          left: 'CANCELLED',
          late: 'APPROVED',
          future: 'APPROVED',
          cancelled: 'APPROVED',
          hidden: 'APPROVED',
          mine: 'APPROVED',
          // Someone who did not come still had the seat.
          absent: 'NO_SHOW',
        },
        rated: ['rated'],
      });

      await expect(
        service.getEventsToRateOrganizer(
          asUser('p1'),
          [
            'open',
            'rated',
            'left',
            'none',
            'late',
            'future',
            'cancelled',
            'hidden',
            'mine',
            'absent',
          ],
          now,
        ),
      ).resolves.toEqual(['open', 'absent']);
    });

    it('leaves out an event of an organizer blocked from the person', async () => {
      const { service } = listSetup({
        events: [anEvent({ id: 'main' }), anEvent({ id: 'co' })],
        seats: { main: 'APPROVED', co: 'APPROVED' },
        hidden: ['co'],
      });

      // `co` co-organizes both events.
      await expect(
        service.getEventsToRateOrganizer(asUser('p1'), ['main', 'co'], now),
      ).resolves.toEqual([]);
    });

    // #65, ADR-0028: rateOrganizer refuses them, so the list must not offer it.
    it('leaves out an event whose main organizer the person blocked', async () => {
      const { service } = listSetup({
        events: [
          anEvent({ id: 'blocked' }),
          anEvent({ id: 'other', organizerId: 'org2' }),
        ],
        seats: { blocked: 'APPROVED', other: 'APPROVED' },
        blocked: ['org'],
      });

      await expect(
        service.getEventsToRateOrganizer(
          asUser('p1'),
          ['blocked', 'other'],
          now,
        ),
      ).resolves.toEqual(['other']);
    });

    it('keeps an event whose co-organizer the person blocked', async () => {
      const { service } = listSetup({
        events: [anEvent({ id: 'e1' })],
        seats: { e1: 'APPROVED' },
        blocked: ['co'],
      });

      // Only the main organizer is rated, and the person did not block them.
      await expect(
        service.getEventsToRateOrganizer(asUser('p1'), ['e1'], now),
      ).resolves.toEqual(['e1']);
    });

    it('asks nothing for an empty page', async () => {
      const { repository, service } = listSetup({ events: [] });

      await expect(
        service.getEventsToRateOrganizer(asUser('p1'), [], now),
      ).resolves.toEqual([]);
      expect(repository.getEventFactsOf).not.toHaveBeenCalled();
    });
  });

  // #235: the organizer's overview points to the rating of the participants.
  describe('getParticipantsToRate', () => {
    const hostedSetup = ({
      events,
      seats = [],
      rated = [],
      hidden = [],
      blocked = [],
    }: {
      events: RatingEventFacts[];
      seats?: { eventId: string; userId: string; status: SeatStatus }[];
      rated?: { eventId: string; participantId: string }[];
      hidden?: string[];
      /** #65: the people the organizer blocked themselves. */
      blocked?: string[];
    }): {
      repository: MockProxy<RatingRepository>;
      service: RatingsService;
    } => {
      const repository = mock<RatingRepository>();
      repository.getEventFactsOf.mockResolvedValue(events);
      repository.getRateableSeatsAt.mockResolvedValue(seats);
      repository.getParticipantsRatedBy.mockResolvedValue(rated);
      const blocks = mock<UserBlockVisibility>();
      blocks.hiddenFor.mockResolvedValue(hidden);
      blocks.blockedBy.mockResolvedValue(blocked);
      blocks.mutedFor.mockResolvedValue([...new Set([...hidden, ...blocked])]);
      return { repository, service: new RatingsService(repository, blocks) };
    };

    it('counts, per event, the participants still to rate by the rating rules', async () => {
      const { repository, service } = hostedSetup({
        events: [
          anEvent({ id: 'open' }),
          anEvent({ id: 'done' }),
          anEvent({ id: 'late', endAt: new Date('2026-11-01T20:00:00Z') }),
          anEvent({ id: 'future', endAt: new Date('2026-11-20T20:00:00Z') }),
          anEvent({ id: 'cancelled', status: 'CANCELLED' }),
          anEvent({ id: 'notMine', organizerId: 'someone' }),
        ],
        seats: [
          { eventId: 'open', userId: 'p1', status: 'APPROVED' },
          // Someone who did not come is still rated.
          { eventId: 'open', userId: 'p2', status: 'NO_SHOW' },
          { eventId: 'open', userId: 'p3', status: 'ATTENDED' },
          // A co-organizer with a seat is not rated as a participant.
          { eventId: 'open', userId: 'co', status: 'APPROVED' },
          { eventId: 'open', userId: 'blocked', status: 'APPROVED' },
          { eventId: 'done', userId: 'p1', status: 'APPROVED' },
        ],
        rated: [
          { eventId: 'open', participantId: 'p3' },
          { eventId: 'done', participantId: 'p1' },
        ],
        hidden: ['blocked'],
      });

      const toRate = await service.getParticipantsToRate(
        asUser('org'),
        ['open', 'done', 'late', 'future', 'cancelled', 'notMine'],
        now,
      );

      expect([...toRate]).toEqual([['open', 2]]);
      expect(repository.getRateableSeatsAt).toHaveBeenCalledWith([
        'open',
        'done',
      ]);
    });

    // #65, ADR-0028: the same people as the list to rate, so it reaches zero.
    it('does not count a participant the organizer blocked', async () => {
      const { service } = hostedSetup({
        events: [anEvent({ id: 'open' }), anEvent({ id: 'onlyBlocked' })],
        seats: [
          { eventId: 'open', userId: 'p1', status: 'APPROVED' },
          { eventId: 'open', userId: 'p2', status: 'APPROVED' },
          { eventId: 'onlyBlocked', userId: 'p2', status: 'ATTENDED' },
        ],
        blocked: ['p2'],
      });

      const toRate = await service.getParticipantsToRate(
        asUser('org'),
        ['open', 'onlyBlocked'],
        now,
      );

      expect([...toRate]).toEqual([['open', 1]]);
    });

    it('asks nothing more when no event is open to the person', async () => {
      const { repository, service } = hostedSetup({
        events: [anEvent({ id: 'notMine', organizerId: 'someone' })],
      });

      await expect(
        service.getParticipantsToRate(asUser('org'), ['notMine'], now),
      ).resolves.toEqual(new Map());
      await expect(
        service.getParticipantsToRate(asUser('org'), [], now),
      ).resolves.toEqual(new Map());
      expect(repository.getEventFactsOf).toHaveBeenCalledTimes(1);
      expect(repository.getRateableSeatsAt).not.toHaveBeenCalled();
    });
  });

  describe('getEventRatingState', () => {
    it('offers a participant the main organizer, with what they gave', async () => {
      const { repository, service } = setup();
      repository.getRatingsByAuthorAt.mockResolvedValue([aRating()]);
      const state = await service.getEventRatingState(asUser('p1'), 'e1', now);
      expect(state).toEqual({
        event: { id: 'e1', title: 'Badminton' },
        deadline: new Date('2026-11-17T20:00:00Z'),
        organizer: {
          user: { id: 'org', name: 'Tomáš' },
          rating: aRating(),
          violations: ['ALREADY_RATED'],
        },
        participants: [],
      });
      expect(repository.getRateableParticipants).not.toHaveBeenCalled();
    });

    it('offers the main organizer the participants, without organizers and blocked people', async () => {
      const { repository, service } = setup({
        hidden: ['blocked'],
        blocked: ['mine'],
      });
      repository.getRateableParticipants.mockResolvedValue([
        { id: 'p1', name: 'Petra', seat: 'APPROVED' },
      ]);
      const state = await service.getEventRatingState(asUser('org'), 'e1', now);
      expect(repository.getRateableParticipants).toHaveBeenCalledWith('e1', [
        'org',
        'co',
        'blocked',
        'mine',
      ]);
      expect(state.organizer).toBeNull();
      expect(state.participants).toEqual([
        { user: { id: 'p1', name: 'Petra' }, rating: null, violations: [] },
      ]);
    });

    it('offers nobody to a participant who blocked the organizer', async () => {
      const { service } = setup({ blocked: ['org'] });
      const state = await service.getEventRatingState(asUser('p1'), 'e1', now);
      expect(state.organizer).toBeNull();
    });

    it('offers a co-organizer nobody', async () => {
      const { service } = setup({ seats: { co: 'APPROVED' } });
      const state = await service.getEventRatingState(asUser('co'), 'e1', now);
      expect(state.organizer).toBeNull();
      expect(state.participants).toEqual([]);
    });

    it('offers someone who cancelled nobody, but lets them see the deadline', async () => {
      const { service } = setup({ seats: { p1: 'CANCELLED' } });
      const state = await service.getEventRatingState(asUser('p1'), 'e1', now);
      expect(state.organizer).toBeNull();
      expect(state.participants).toEqual([]);
    });
  });
});

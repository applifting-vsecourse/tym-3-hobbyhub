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
}: {
  event?: RatingEventFacts | null;
  seats?: Record<string, SeatStatus>;
  hidden?: string[];
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
    }: {
      events: RatingEventFacts[];
      seats?: Record<string, SeatStatus>;
      rated?: string[];
      hidden?: string[];
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

    it('asks nothing for an empty page', async () => {
      const { repository, service } = listSetup({ events: [] });

      await expect(
        service.getEventsToRateOrganizer(asUser('p1'), [], now),
      ).resolves.toEqual([]);
      expect(repository.getEventFactsOf).not.toHaveBeenCalled();
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
      const { repository, service } = setup({ hidden: ['blocked'] });
      repository.getRateableParticipants.mockResolvedValue([
        { id: 'p1', name: 'Petra', seat: 'APPROVED' },
      ]);
      const state = await service.getEventRatingState(asUser('org'), 'e1', now);
      expect(repository.getRateableParticipants).toHaveBeenCalledWith('e1', [
        'org',
        'co',
        'blocked',
      ]);
      expect(state.organizer).toBeNull();
      expect(state.participants).toEqual([
        { user: { id: 'p1', name: 'Petra' }, rating: null, violations: [] },
      ]);
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

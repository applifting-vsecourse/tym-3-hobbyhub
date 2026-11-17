import {
  areEventRatingsRevealed,
  isRatingRevealed,
  organizerRatingViolations,
  participantRatingViolations,
  ratingDeadlineOf,
  RatingEventFacts,
  ratingEventViolations,
  RatingViolation,
  shownRatingScore,
} from './rating';

const endAt = new Date('2026-11-10T20:00:00Z');
const day = 24 * 60 * 60 * 1000;
const after = (ms: number): Date => new Date(endAt.getTime() + ms);

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

describe('rating period (ADR-0027)', () => {
  it('ends seven days after the end of the event', () => {
    expect(ratingDeadlineOf(endAt)).toEqual(after(7 * day));
  });

  it('reveals the ratings only strictly after the deadline', () => {
    expect(isRatingRevealed(endAt, after(7 * day))).toBe(false);
    expect(isRatingRevealed(endAt, after(7 * day + 1))).toBe(true);
  });

  it('never reveals the ratings of an event hidden or not held', () => {
    const late = after(8 * day);
    expect(areEventRatingsRevealed(anEvent(), late)).toBe(true);
    expect(areEventRatingsRevealed(anEvent({ status: 'FINISHED' }), late)).toBe(
      true,
    );
    expect(areEventRatingsRevealed(anEvent({ isHidden: true }), late)).toBe(
      false,
    );
    expect(areEventRatingsRevealed(anEvent({ status: 'NOT_HELD' }), late)).toBe(
      false,
    );
  });
});

describe('ratingEventViolations', () => {
  it('lets an event that ended be rated until the deadline', () => {
    expect(ratingEventViolations(anEvent(), after(1))).toEqual([]);
    expect(ratingEventViolations(anEvent(), after(7 * day))).toEqual([]);
  });

  it('refuses before the end and after the deadline', () => {
    expect(ratingEventViolations(anEvent(), after(-1))).toEqual([
      'EVENT_NOT_OVER',
    ]);
    expect(ratingEventViolations(anEvent(), after(7 * day + 1))).toEqual([
      'RATING_CLOSED',
    ]);
  });

  it.each([
    ['CANCELLED', 'EVENT_CANCELLED'],
    ['NOT_HELD', 'EVENT_NOT_HELD'],
    ['DRAFT', 'EVENT_NOT_OVER'],
  ] as const)('refuses a %s event', (status, violation) => {
    expect(ratingEventViolations(anEvent({ status }), after(day))).toEqual([
      violation,
    ]);
  });

  it('refuses an event an administrator hid', () => {
    expect(
      ratingEventViolations(anEvent({ isHidden: true }), after(day)),
    ).toEqual(['EVENT_HIDDEN']);
  });
});

describe('organizerRatingViolations', () => {
  const rate = (
    overrides: Partial<Parameters<typeof organizerRatingViolations>[0]> = {},
  ): RatingViolation[] =>
    organizerRatingViolations({
      event: anEvent(),
      authorId: 'p1',
      authorSeat: 'APPROVED',
      alreadyRated: false,
      now: after(day),
      ...overrides,
    });

  it.each(['APPROVED', 'ATTENDED', 'NO_SHOW'] as const)(
    'lets a participant with a %s seat rate, whether they came or not',
    (authorSeat) => {
      expect(rate({ authorSeat })).toEqual([]);
    },
  );

  it.each([null, 'CANCELLED', 'WAITLISTED', 'INVITED', 'DECLINED'] as const)(
    'refuses someone whose seat is %s',
    (authorSeat) => {
      expect(rate({ authorSeat })).toEqual(['NO_SEAT']);
    },
  );

  it.each(['org', 'co'])(
    'refuses an organizer of the event (%s), even with a seat (ADR-0005)',
    (authorId) => {
      expect(rate({ authorId })).toEqual(['IS_ORGANIZER']);
    },
  );

  it('refuses a second rating', () => {
    expect(rate({ alreadyRated: true })).toEqual(['ALREADY_RATED']);
  });
});

describe('participantRatingViolations', () => {
  const rate = (
    overrides: Partial<Parameters<typeof participantRatingViolations>[0]> = {},
  ): RatingViolation[] =>
    participantRatingViolations({
      event: anEvent(),
      authorId: 'org',
      participantId: 'p1',
      participantSeat: 'NO_SHOW',
      alreadyRated: false,
      now: after(day),
      ...overrides,
    });

  it('lets the main organizer rate someone who did not come', () => {
    expect(rate()).toEqual([]);
  });

  it('refuses a co-organizer', () => {
    expect(rate({ authorId: 'co' })).toEqual(['NOT_MAIN_ORGANIZER']);
  });

  it('refuses rating a co-organizer as a participant', () => {
    expect(rate({ participantId: 'co', participantSeat: 'APPROVED' })).toEqual([
      'PARTICIPANT_IS_ORGANIZER',
    ]);
  });

  it('refuses someone who cancelled their seat', () => {
    expect(rate({ participantSeat: 'CANCELLED' })).toEqual(['NO_SEAT']);
  });

  it('lists every reason at once', () => {
    expect(
      rate({ alreadyRated: true, now: after(8 * day), authorId: 'co' }),
    ).toEqual(['RATING_CLOSED', 'NOT_MAIN_ORGANIZER', 'ALREADY_RATED']);
  });
});

describe('shownRatingScore', () => {
  it('hides both numbers from others below three ratings', () => {
    expect(shownRatingScore({ count: 0, average: null }, false)).toEqual({
      count: null,
      average: null,
    });
    expect(shownRatingScore({ count: 2, average: 5 }, false)).toEqual({
      count: null,
      average: null,
    });
  });

  it('shows the score to others from three ratings on', () => {
    expect(shownRatingScore({ count: 3, average: 4 }, false)).toEqual({
      count: 3,
      average: 4,
    });
  });

  it('shows the owner everything', () => {
    expect(shownRatingScore({ count: 2, average: 5 }, true)).toEqual({
      count: 2,
      average: 5,
    });
  });
});

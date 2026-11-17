// #236, ADR-0027: the vocabulary of ratings after an event. Plain TypeScript:
// no Nest, no Prisma, no HTTP.

export const RATING_DIRECTIONS = ['TO_ORGANIZER', 'TO_PARTICIPANT'] as const;

/**
 * Which way a rating goes. A participant rates the main organizer
 * (TO_ORGANIZER), the main organizer rates a participant (TO_PARTICIPANT).
 * Participants do not rate each other.
 */
export type RatingDirection = (typeof RATING_DIRECTIONS)[number];

export const RATING_STARS_MIN = 1;
export const RATING_STARS_MAX = 5;
export const RATING_COMMENT_MAX_LENGTH = 500;

/**
 * Days after the end of an event during which its ratings can be given. When
 * they are over, every rating of the event is revealed at once (ADR-0027).
 * The view `rating_revealed` in the migration holds the same number.
 */
export const RATING_WINDOW_DAYS = 7;

/**
 * How many revealed ratings it takes before others see the average. The views
 * `user_rating_score` and `event_rating_score` hold the same number.
 */
export const RATING_MIN_COUNT_TO_SHOW = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Seats that may rate the organizer and be rated by them: approved at the end
 * of the event, whether the person came or not. Attendance does not matter.
 */
export const RATEABLE_SEAT_STATUSES = [
  'APPROVED',
  'ATTENDED',
  'NO_SHOW',
] as const;

export type SeatStatus =
  | (typeof RATEABLE_SEAT_STATUSES)[number]
  | 'WAITLISTED'
  | 'CANCELLED'
  | 'INVITED'
  | 'DECLINED';

export const isRateableSeat = (status: SeatStatus | null): boolean =>
  status !== null &&
  (RATEABLE_SEAT_STATUSES as readonly string[]).includes(status);

export type Rating = {
  id: string;
  eventId: string;
  /** The participant whichever way the rating goes. */
  participantId: string;
  direction: RatingDirection;
  authorId: string;
  ratedUserId: string;
  stars: number;
  comment: string | null;
  createdAt: Date;
};

export type NewRating = {
  eventId: string;
  participantId: string;
  direction: RatingDirection;
  authorId: string;
  ratedUserId: string;
  stars: number;
  comment: string | null;
};

/** The last moment a rating of the event can be given. */
export const ratingDeadlineOf = (endAt: Date): Date =>
  new Date(endAt.getTime() + RATING_WINDOW_DAYS * DAY_MS);

/**
 * ADR-0027: the ratings of an event are revealed to the rated people, and
 * count in their scores, once the rating period is over. Strictly after the
 * deadline, like the view.
 */
export const isRatingRevealed = (endAt: Date, now: Date): boolean =>
  ratingDeadlineOf(endAt).getTime() < now.getTime();

/**
 * Whether the rated people see the event's ratings and count them: the period
 * is over, the event took place and no administrator hid it. The same rule as
 * the view `rating_revealed`.
 */
export const areEventRatingsRevealed = (
  event: Pick<RatingEventFacts, 'endAt' | 'status' | 'isHidden'>,
  now: Date,
): boolean =>
  isRatingRevealed(event.endAt, now) &&
  (event.status === 'PUBLISHED' || event.status === 'FINISHED') &&
  !event.isHidden;

/** What the rules read of an event. */
export type RatingEventFacts = {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED' | 'NOT_HELD';
  endAt: Date;
  isHidden: boolean;
  organizerId: string;
  organizerName: string;
  coOrganizerIds: string[];
};

/** The main organizer or a co-organizer of the event. */
export const isAnyOrganizerOf = (
  event: Pick<RatingEventFacts, 'organizerId' | 'coOrganizerIds'>,
  userId: string,
): boolean =>
  event.organizerId === userId || event.coOrganizerIds.includes(userId);

export type RatingEventViolation =
  | 'EVENT_NOT_OVER'
  | 'RATING_CLOSED'
  | 'EVENT_CANCELLED'
  | 'EVENT_NOT_HELD'
  | 'EVENT_HIDDEN';

export type RatingViolation =
  | RatingEventViolation
  | 'IS_ORGANIZER'
  | 'NOT_MAIN_ORGANIZER'
  | 'PARTICIPANT_IS_ORGANIZER'
  | 'NO_SEAT'
  | 'ALREADY_RATED';

/**
 * Whether the event can be rated now: it took place, is over, and the rating
 * period is still on. A draft has never taken place, so it is "not over".
 */
export function ratingEventViolations(
  event: RatingEventFacts,
  now: Date,
): RatingEventViolation[] {
  if (event.status === 'CANCELLED') return ['EVENT_CANCELLED'];
  if (event.status === 'NOT_HELD') return ['EVENT_NOT_HELD'];
  if (event.isHidden) return ['EVENT_HIDDEN'];
  if (event.status === 'DRAFT' || event.endAt.getTime() > now.getTime()) {
    return ['EVENT_NOT_OVER'];
  }
  if (ratingDeadlineOf(event.endAt).getTime() < now.getTime()) {
    return ['RATING_CLOSED'];
  }
  return [];
}

/**
 * A participant rates the main organizer. They must have had a seat at the
 * end of the event, and must not run the event themselves (ADR-0005).
 */
export function organizerRatingViolations(input: {
  event: RatingEventFacts;
  authorId: string;
  authorSeat: SeatStatus | null;
  alreadyRated: boolean;
  now: Date;
}): RatingViolation[] {
  const { event, authorId } = input;
  const violations: RatingViolation[] = [
    ...ratingEventViolations(event, input.now),
  ];
  if (isAnyOrganizerOf(event, authorId)) violations.push('IS_ORGANIZER');
  else if (!isRateableSeat(input.authorSeat)) violations.push('NO_SEAT');
  if (input.alreadyRated) violations.push('ALREADY_RATED');
  return violations;
}

/**
 * The main organizer rates a participant: anyone who had a seat at the end of
 * the event, including someone who did not come. Co-organizers do not rate,
 * and are not rated as participants of the event they run.
 */
export function participantRatingViolations(input: {
  event: RatingEventFacts;
  authorId: string;
  participantId: string;
  participantSeat: SeatStatus | null;
  alreadyRated: boolean;
  now: Date;
}): RatingViolation[] {
  const { event } = input;
  const violations: RatingViolation[] = [
    ...ratingEventViolations(event, input.now),
  ];
  if (event.organizerId !== input.authorId) {
    violations.push('NOT_MAIN_ORGANIZER');
  }
  if (isAnyOrganizerOf(event, input.participantId)) {
    violations.push('PARTICIPANT_IS_ORGANIZER');
  } else if (!isRateableSeat(input.participantSeat)) {
    violations.push('NO_SEAT');
  }
  if (input.alreadyRated) violations.push('ALREADY_RATED');
  return violations;
}

/** A score as the views compute it: revealed ratings only. */
export type RatingScore = {
  count: number;
  /** Null when there is no rating. */
  average: number | null;
};

export const NO_RATING_SCORE: RatingScore = { count: 0, average: null };

/**
 * What a score shows. Below `RATING_MIN_COUNT_TO_SHOW` others see neither the
 * average nor the count, so they cannot tell none from two. The owner sees
 * both.
 */
export type ShownRatingScore = {
  count: number | null;
  average: number | null;
};

export function shownRatingScore(
  score: RatingScore,
  isOwner: boolean,
): ShownRatingScore {
  if (isOwner) return { count: score.count, average: score.average };
  return score.count >= RATING_MIN_COUNT_TO_SHOW
    ? { count: score.count, average: score.average }
    : { count: null, average: null };
}

/** A person's two scores, as an organizer and as a participant. */
export type UserRatingScores = {
  asOrganizer: RatingScore;
  asParticipant: RatingScore;
};

export type ShownUserRatingScores = {
  asOrganizer: ShownRatingScore;
  asParticipant: ShownRatingScore;
};

export const NO_USER_RATING_SCORES: UserRatingScores = {
  asOrganizer: NO_RATING_SCORE,
  asParticipant: NO_RATING_SCORE,
};

export const shownUserRatingScores = (
  scores: UserRatingScores,
  isOwner: boolean,
): ShownUserRatingScores => ({
  asOrganizer: shownRatingScore(scores.asOrganizer, isOwner),
  asParticipant: shownRatingScore(scores.asParticipant, isOwner),
});

export type RatingPerson = { id: string; name: string };

/** A revealed rating someone received, for "Moje hodnocení". */
export type ReceivedRating = {
  id: string;
  direction: RatingDirection;
  stars: number;
  comment: string | null;
  createdAt: Date;
  event: { id: string; title: string };
  /** Null for an author whose account was deleted. */
  author: RatingPerson | null;
};

/** A rating someone gave, revealed or not. */
export type GivenRating = {
  id: string;
  direction: RatingDirection;
  stars: number;
  comment: string | null;
  createdAt: Date;
  event: { id: string; title: string };
  ratedUser: RatingPerson;
  isRevealed: boolean;
};

export type Page = { limit: number; offset: number };

export const RATINGS_DEFAULT_LIMIT = 20;
export const RATINGS_MAX_LIMIT = 50;

/** How many revealed ratings have each number of stars, 1 to 5. */
export type StarDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export type ReceivedRatingPage = {
  score: RatingScore;
  distribution: StarDistribution;
  items: ReceivedRating[];
  total: number;
};

export type GivenRatingPage = {
  items: GivenRating[];
  total: number;
};

/** Who the signed-in person may rate at one event, and what they gave. */
export type RatingTarget = {
  user: RatingPerson;
  /** What they gave this person, if they did. */
  rating: Rating | null;
  /** Empty when they may rate this person now. */
  violations: RatingViolation[];
};

export type EventRatingState = {
  event: { id: string; title: string };
  deadline: Date;
  /** The main organizer, when the person had a seat. */
  organizer: RatingTarget | null;
  /** The participants, when the person is the main organizer. */
  participants: RatingTarget[];
};

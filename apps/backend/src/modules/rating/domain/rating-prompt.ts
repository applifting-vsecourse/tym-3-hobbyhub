import { RatingPromptKind } from '@/modules/notification/domain/notification';
import {
  isRateableSeat,
  RATING_WINDOW_DAYS,
  ratingDeadlineOf,
  SeatStatus,
} from '@/modules/rating/domain/rating';

// #236, ADR-0021, ADR-0027: the calls to rate an event after it ended. FIRST
// goes two hours after the end, LAST_CALL when the last day of the rating
// period begins, to whoever still has someone to rate. Each is due from its
// moment until the next one takes over, so a backend that was down at the
// moment still sends it late; once the last call is due, the first is not.

const HOUR_MS = 60 * 60 * 1000;

/** How long after the end of the event the first call goes. */
export const RATING_PROMPT_DELAY_MS = 2 * HOUR_MS;

/** How long before the end of the rating period the last call goes. */
export const RATING_LAST_CALL_LEAD_MS = 24 * HOUR_MS;

export const ratingPromptMomentOf = (
  endAt: Date,
  kind: RatingPromptKind,
): Date =>
  kind === 'FIRST'
    ? new Date(endAt.getTime() + RATING_PROMPT_DELAY_MS)
    : new Date(ratingDeadlineOf(endAt).getTime() - RATING_LAST_CALL_LEAD_MS);

/**
 * The events the cron has to look at: those that ended between these two
 * moments ago. Nothing outside the window can have a call due.
 */
export const ratingPromptHorizon = (
  now: Date,
): { endedAfter: Date; endedBefore: Date } => ({
  // The rating period is still on.
  endedAfter: new Date(now.getTime() - RATING_WINDOW_DAYS * 24 * HOUR_MS),
  // The first call is due.
  endedBefore: new Date(now.getTime() - RATING_PROMPT_DELAY_MS),
});

/**
 * The call due now, or null: the one whose window holds `now`, unless it
 * went out already. At most one per pass.
 */
export const dueRatingPrompt = (
  event: { endAt: Date; sent: readonly RatingPromptKind[] },
  now: Date,
): RatingPromptKind | null => {
  const at = now.getTime();
  if (at > ratingDeadlineOf(event.endAt).getTime()) return null;
  const kind: RatingPromptKind | null =
    at >= ratingPromptMomentOf(event.endAt, 'LAST_CALL').getTime()
      ? 'LAST_CALL'
      : at >= ratingPromptMomentOf(event.endAt, 'FIRST').getTime()
        ? 'FIRST'
        : null;
  return kind && !event.sent.includes(kind) ? kind : null;
};

/** An event the cron looks at, with what decides who gets a call. */
export type RatingPromptCandidate = {
  id: string;
  endAt: Date;
  organizerId: string;
  coOrganizerIds: string[];
  /** Every seat on the event, whatever its state; none of a deleted account. */
  seats: { userId: string; status: SeatStatus }[];
  /** The calls that went out already. */
  sent: RatingPromptKind[];
  /** Participants who rated the organizer. */
  ratedOrganizer: string[];
  /** Participants the organizer rated. */
  ratedByOrganizer: string[];
};

export type RatingPromptRecipients = {
  /** The main organizer, when they have someone left to rate. */
  organizerId: string | null;
  /** Participants who have the organizer left to rate. */
  participantIds: string[];
};

/**
 * Who gets the call: the people the rating rules let rate (a seat at the end
 * of the event, not running it), without anyone blocked from the organizer
 * (`blockedIds`), who could not rate them. The first call goes to all of
 * them, the last only to those who still have someone to rate.
 */
export function ratingPromptRecipients(
  event: RatingPromptCandidate,
  kind: RatingPromptKind,
  blockedIds: readonly string[],
): RatingPromptRecipients {
  const organizers = [event.organizerId, ...event.coOrganizerIds];
  const participants = event.seats
    .filter(
      ({ userId, status }) =>
        isRateableSeat(status) &&
        !organizers.includes(userId) &&
        !blockedIds.includes(userId),
    )
    .map(({ userId }) => userId);

  const participantIds =
    kind === 'FIRST'
      ? participants
      : participants.filter((id) => !event.ratedOrganizer.includes(id));
  const organizerLeftToRate =
    kind === 'FIRST'
      ? participants
      : participants.filter((id) => !event.ratedByOrganizer.includes(id));

  return {
    organizerId: organizerLeftToRate.length > 0 ? event.organizerId : null,
    participantIds,
  };
}

import type { RatingTarget } from "@/features/rating/api/ratingSchemas"

// #235: the main organizer rates the participants of an event from one list.
// A tap on the stars only drafts a rating; nothing leaves the page until the
// organizer reviews the drafts and sends them. Plain functions over the
// drafts, so the rules of the list are tested without rendering it.

/** One participant's rating as the organizer is drafting it. */
export type ParticipantDraft = { stars: number | null; comment: string }

/** The drafts by participant, keyed with `draftKey`. */
export type ParticipantDrafts = Record<string, ParticipantDraft>

/**
 * The form field of a participant's draft. A prefix, so no id is ever read as
 * an array index by the form library.
 */
export const draftKey = (userId: string) => `u_${userId}`

export const EMPTY_DRAFT: ParticipantDraft = { stars: null, comment: "" }

/** Stars at or below this ask for a reason, still optionally. */
export const LOW_STARS = 2

/** The stars the organizer fills in for everyone left at once. */
export const PREFILL_STARS = 5

/** May the organizer rate this participant now: not rated yet, nothing against it. */
export const isOpenTarget = (target: RatingTarget) =>
  target.rating === null && target.violations.length === 0

export const emptyDrafts = (targets: RatingTarget[]): ParticipantDrafts =>
  Object.fromEntries(targets.map((target) => [draftKey(target.user.id), EMPTY_DRAFT]))

const draftOf = (drafts: ParticipantDrafts, userId: string): ParticipantDraft =>
  drafts[draftKey(userId)] ?? EMPTY_DRAFT

/** What one participant's rating will say once sent. */
export type ReadyRating = { target: RatingTarget; stars: number; comment: string }

/**
 * The drafts that would be sent: of participants who may be rated, with stars.
 * In the order of the list.
 */
export function readyRatings(targets: RatingTarget[], drafts: ParticipantDrafts): ReadyRating[] {
  return targets.filter(isOpenTarget).flatMap((target) => {
    const { stars, comment } = draftOf(drafts, target.user.id)
    return stars === null ? [] : [{ target, stars, comment: comment.trim() }]
  })
}

/** How far the organizer is: sent ratings out of everyone on the list. */
export function progressOf(targets: RatingTarget[]) {
  return {
    rated: targets.filter((target) => target.rating !== null).length,
    total: targets.length,
  }
}

/**
 * Fills the most stars into every draft of a participant who may be rated and
 * has no stars yet. Stars the organizer chose stay; nothing is sent.
 * Returns whose drafts were filled, so they can be emptied again.
 */
export function prefill(
  targets: RatingTarget[],
  drafts: ParticipantDrafts,
): { drafts: ParticipantDrafts; prefilledIds: string[] } {
  const prefilledIds = targets
    .filter((target) => isOpenTarget(target) && draftOf(drafts, target.user.id).stars === null)
    .map((target) => target.user.id)
  const next = { ...drafts }
  for (const userId of prefilledIds) {
    next[draftKey(userId)] = { ...draftOf(drafts, userId), stars: PREFILL_STARS }
  }
  return { drafts: next, prefilledIds }
}

/** Empties the stars that `prefill` put in; everything else stays. */
export function clearPrefill(
  drafts: ParticipantDrafts,
  prefilledIds: readonly string[],
): ParticipantDrafts {
  const next = { ...drafts }
  for (const userId of prefilledIds) {
    next[draftKey(userId)] = { ...draftOf(drafts, userId), stars: null }
  }
  return next
}

/**
 * The review before sending. The most common number of stars given without a
 * comment is one line ("23× ★★★★★") when at least two share it; everything
 * else, with a comment or other stars, is listed one by one, the lowest first.
 */
export function reviewOf(ready: ReadyRating[]): {
  group: { stars: number; ratings: ReadyRating[] } | null
  singles: ReadyRating[]
} {
  const plain = ready.filter((rating) => rating.comment === "")
  const counts = new Map<number, number>()
  for (const { stars } of plain) counts.set(stars, (counts.get(stars) ?? 0) + 1)
  // The largest group; on a tie, the higher stars (the usual "all were fine").
  const [groupStars, groupSize] = [...counts.entries()].reduce<[number | null, number]>(
    (best, [stars, count]) =>
      count > best[1] || (count === best[1] && best[0] !== null && stars > best[0])
        ? [stars, count]
        : best,
    [null, 0],
  )
  if (groupStars === null || groupSize < 2) {
    return { group: null, singles: lowestFirst(ready) }
  }
  const isGrouped = (rating: ReadyRating) => rating.comment === "" && rating.stars === groupStars
  return {
    group: { stars: groupStars, ratings: ready.filter(isGrouped) },
    singles: lowestFirst(ready.filter((rating) => !isGrouped(rating))),
  }
}

// Stable: equal stars keep the order of the list.
const lowestFirst = (ratings: ReadyRating[]) =>
  ratings.toSorted((first, second) => first.stars - second.stars)

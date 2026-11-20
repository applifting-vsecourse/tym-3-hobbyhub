import { z } from "zod"

/**
 * A rating score as the server sends it with a profile or an event (#236,
 * ADR-0027): a plain average of the revealed ratings, unrounded. Others get
 * both numbers null below three ratings; the owner always gets them. Shared
 * here because the profile, the event and the ratings each parse it.
 */
export const ratingScoreSchema = z.object({
  count: z.number().nullable(),
  average: z.number().nullable(),
})

export const userRatingScoresSchema = z.object({
  asOrganizer: ratingScoreSchema,
  asParticipant: ratingScoreSchema,
})

export type RatingScore = z.infer<typeof ratingScoreSchema>
export type UserRatingScores = z.infer<typeof userRatingScoresSchema>

/** Others see the average from this many revealed ratings (the server's rule). */
export const RATING_MIN_COUNT_TO_SHOW = 3

export const RATING_STARS_MAX = 5

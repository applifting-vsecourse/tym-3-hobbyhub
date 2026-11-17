import { z } from "zod"

import { ratingScoreSchema } from "@/lib/ratingScore"

// Mirror of the server's rating DTOs (#236, ADR-0027). A participant rates the
// main organizer, the main organizer rates the participants; nobody sees a
// rating about them until the rating period is over.

export const RATING_DIRECTIONS = ["TO_ORGANIZER", "TO_PARTICIPANT"] as const
export const ratingDirectionSchema = z.enum(RATING_DIRECTIONS)

/** The same limit as the server's `RATING_COMMENT_MAX_LENGTH`. */
export const RATING_COMMENT_MAX_LENGTH = 500

export const ratingViolationSchema = z.enum([
  "EVENT_NOT_OVER",
  "RATING_CLOSED",
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_HIDDEN",
  "IS_ORGANIZER",
  "NOT_MAIN_ORGANIZER",
  "PARTICIPANT_IS_ORGANIZER",
  "NO_SEAT",
  "ALREADY_RATED",
])

const ratingPersonSchema = z.object({ id: z.string(), name: z.string() })
const ratedEventSchema = z.object({ id: z.string(), title: z.string() })

/** A rating as its author sees it. */
export const ratingSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  direction: ratingDirectionSchema,
  ratedUserId: z.string(),
  stars: z.number().int(),
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export const ratingTargetSchema = z.object({
  user: ratingPersonSchema,
  /** What the signed-in person gave them, if they did. */
  rating: ratingSchema.nullable(),
  /** Empty when they may be rated now. */
  violations: z.array(ratingViolationSchema),
})

/** Who the signed-in person may rate at one event, and until when. */
export const eventRatingStateSchema = z.object({
  event: ratedEventSchema,
  deadline: z.coerce.date(),
  /** The main organizer, when the person had a seat. */
  organizer: ratingTargetSchema.nullable(),
  /** The participants, when the person is the main organizer. */
  participants: z.array(ratingTargetSchema),
})

export const receivedRatingSchema = z.object({
  id: z.string(),
  direction: ratingDirectionSchema,
  stars: z.number().int(),
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
  event: ratedEventSchema,
  /** Null when the author deleted their account. */
  author: ratingPersonSchema.nullable(),
})

export const receivedRatingPageSchema = z.object({
  score: ratingScoreSchema,
  /** How many revealed ratings have each number of stars. */
  distribution: z.object({
    1: z.number(),
    2: z.number(),
    3: z.number(),
    4: z.number(),
    5: z.number(),
  }),
  items: z.array(receivedRatingSchema),
  total: z.number(),
})

export const givenRatingSchema = z.object({
  id: z.string(),
  direction: ratingDirectionSchema,
  stars: z.number().int(),
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
  event: ratedEventSchema,
  ratedUser: ratingPersonSchema,
  /** Whether the rated person sees it yet (the period is over). */
  isRevealed: z.boolean(),
})

export const givenRatingPageSchema = z.object({
  items: z.array(givenRatingSchema),
  total: z.number(),
})

/** The body of a 400 that refuses a rating. */
export const ratingRefusalSchema = z.object({ violations: z.array(ratingViolationSchema) })

export type RatingDirection = z.infer<typeof ratingDirectionSchema>
export type RatingViolation = z.infer<typeof ratingViolationSchema>
export type Rating = z.infer<typeof ratingSchema>
export type RatingTarget = z.infer<typeof ratingTargetSchema>
export type EventRatingState = z.infer<typeof eventRatingStateSchema>
export type ReceivedRating = z.infer<typeof receivedRatingSchema>
export type ReceivedRatingPage = z.infer<typeof receivedRatingPageSchema>
export type GivenRating = z.infer<typeof givenRatingSchema>
export type GivenRatingPage = z.infer<typeof givenRatingPageSchema>

/** What the author says: whole stars and an optional comment. */
export type RatingInput = { stars: number; comment?: string }

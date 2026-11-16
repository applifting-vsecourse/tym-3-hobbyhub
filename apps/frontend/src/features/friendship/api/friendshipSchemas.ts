import { z } from "zod"

/** #225: where I stand with another person. */
export const FRIEND_RELATIONS = ["none", "request_sent", "request_received", "friends"] as const

export const friendRelationSchema = z.enum(FRIEND_RELATIONS)

export type FriendRelation = z.infer<typeof friendRelationSchema>

/** The server searches from 2 characters, so one letter cannot list everybody. */
export const FRIEND_SEARCH_MIN_LENGTH = 2
export const FRIEND_SEARCH_MAX_LENGTH = 100

/** One person found: only the public profile, never the e-mail. */
export const friendSearchItemSchema = z.object({
  id: z.string(),
  /** The nickname, the one name a person has (ADR-0025). */
  name: z.string(),
  /** A WebP data URL, or `avatar:<name>`. */
  image: z.string().nullable(),
  relation: friendRelationSchema,
})

export type FriendSearchItem = z.infer<typeof friendSearchItemSchema>

export const friendSearchPageSchema = z.object({
  items: z.array(friendSearchItemSchema),
  /** Where the next page starts; null on the last one. */
  nextOffset: z.number().int().nullable(),
})

export const friendRelationResponseSchema = z.object({ relation: friendRelationSchema })

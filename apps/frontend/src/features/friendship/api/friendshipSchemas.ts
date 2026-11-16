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

/** #228: a request waiting for my decision, with the sender's public profile only. */
export const receivedFriendRequestSchema = z.object({
  id: z.string(),
  requestedAt: z.coerce.date(),
  sender: z.object({
    id: z.string(),
    name: z.string(),
    nickname: z.string().nullable(),
    image: z.string().nullable(),
  }),
})

export type ReceivedFriendRequest = z.infer<typeof receivedFriendRequestSchema>

export const receivedFriendRequestPageSchema = z.object({
  items: z.array(receivedFriendRequestSchema),
  /** All the requests waiting for me: the number on the tab. */
  total: z.number().int(),
  /** Where the next page starts; null on the last one. */
  nextOffset: z.number().int().nullable(),
})

/** #228: what I do with a request someone sent me. */
export type FriendRequestDecision = "accept" | "reject"

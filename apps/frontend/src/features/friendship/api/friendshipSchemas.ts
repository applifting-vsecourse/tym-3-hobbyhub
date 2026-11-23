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
  /** More people match than the search shows (100): narrow the nickname. */
  isCapped: z.boolean(),
})

export const friendRelationResponseSchema = z.object({ relation: friendRelationSchema })

/** #228: a request waiting for my decision, with the sender's public profile only. */
export const receivedFriendRequestSchema = z.object({
  id: z.string(),
  requestedAt: z.coerce.date(),
  sender: z.object({
    id: z.string(),
    name: z.string(),
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

/** #226: the orders of the friends list; the newest friendship first by default. */
export const FRIEND_LIST_SORTS = ["newest", "oldest", "name_asc", "name_desc"] as const

export type FriendListSort = (typeof FRIEND_LIST_SORTS)[number]

export const DEFAULT_FRIEND_LIST_SORT = "newest" satisfies FriendListSort

/** #226: one of my friends, with only their public profile and since when. */
export const friendSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  friendsSince: z.coerce.date(),
})

export type Friend = z.infer<typeof friendSchema>

export const friendPageSchema = z.object({
  items: z.array(friendSchema),
  /** All my friends, the number in the heading. */
  total: z.number().int(),
  /** Where the next page starts; null on the last one. */
  nextOffset: z.number().int().nullable(),
})

/** #226: how many friends I have, the number on the tab. */
export const friendCountSchema = z.object({ count: z.number().int() })

/** #228: how many requests wait for me, the number on the tab. */
export const friendRequestCountSchema = z.object({ count: z.number().int() })

import { z } from "zod"

import {
  DEFAULT_FRIEND_LIST_SORT,
  FRIEND_LIST_SORTS,
  FRIEND_SEARCH_MAX_LENGTH,
} from "@/features/friendship/api/friendshipSchemas"

/**
 * The tabs of Přátelé (#227), in their order on the page. The one list of
 * them. #226 puts the friends first and adds „Akce přátel“.
 */
export const FRIENDS_TABS = ["friends", "events", "requests", "search"] as const

export type FriendsTab = (typeof FRIENDS_TABS)[number]

/** "Přátelé" is the default (#226): its address has no `tab`. */
export const DEFAULT_FRIENDS_TAB = "friends" satisfies FriendsTab

/**
 * The `tab` in the address: every tab but the default one; anything unknown
 * falls back to the default. `q` is the text searched there (#225), kept in
 * the address so going back from a profile shows the same people. It is
 * trimmed and cut to the longest text the server takes, like what the field
 * sends, so `?q=%20a%20` asks for 2 characters instead of failing with 400.
 * `sort` is the order of the friends (#226), likewise, without the default one.
 */
export const friendsSearchSchema = z.object({
  tab: z.enum(FRIENDS_TABS).exclude([DEFAULT_FRIENDS_TAB]).optional().catch(undefined),
  q: z
    .string()
    .transform((text) => text.trim().slice(0, FRIEND_SEARCH_MAX_LENGTH))
    .optional()
    .catch(undefined),
  sort: z.enum(FRIEND_LIST_SORTS).exclude([DEFAULT_FRIEND_LIST_SORT]).optional().catch(undefined),
})

export type FriendsSearch = z.infer<typeof friendsSearchSchema>

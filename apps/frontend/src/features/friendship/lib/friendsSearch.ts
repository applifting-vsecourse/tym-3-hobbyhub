import { z } from "zod"

import { FRIEND_SEARCH_MAX_LENGTH } from "@/features/friendship/api/friendshipSchemas"

/** The tabs of Přátelé (#227), in their order on the page. The one list of them. */
export const FRIENDS_TABS = ["search", "friends", "requests"] as const

export type FriendsTab = (typeof FRIENDS_TABS)[number]

/** "Vyhledat uživatele" is the default: its address has no `tab`. */
export const DEFAULT_FRIENDS_TAB = "search" satisfies FriendsTab

/**
 * The `tab` in the address: every tab but the default one; anything unknown
 * falls back to the default. `q` is the text searched there (#225), kept in
 * the address so going back from a profile shows the same people. It is
 * trimmed and cut to the longest text the server takes, like what the field
 * sends, so `?q=%20a%20` asks for 2 characters instead of failing with 400.
 */
export const friendsSearchSchema = z.object({
  tab: z.enum(FRIENDS_TABS).exclude([DEFAULT_FRIENDS_TAB]).optional().catch(undefined),
  q: z
    .string()
    .transform((text) => text.trim().slice(0, FRIEND_SEARCH_MAX_LENGTH))
    .optional()
    .catch(undefined),
})

export type FriendsSearch = z.infer<typeof friendsSearchSchema>

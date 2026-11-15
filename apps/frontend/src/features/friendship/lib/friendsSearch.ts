import { z } from "zod"

/** The tabs of Přátelé (#227), in their order on the page. */
export const FRIENDS_TABS = ["search", "friends", "requests"] as const

export type FriendsTab = (typeof FRIENDS_TABS)[number]

/**
 * "Vyhledat uživatele" is the default and has no param; anything unknown
 * falls back to it. `q` is the text searched there (#225), kept in the
 * address so going back from a profile shows the same people.
 */
export const friendsSearchSchema = z.object({
  tab: z.enum(["friends", "requests"]).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
})

export type FriendsSearch = z.infer<typeof friendsSearchSchema>

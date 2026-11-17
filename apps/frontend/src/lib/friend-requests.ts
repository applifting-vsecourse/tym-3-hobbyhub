import { api, HTTPError } from "@/lib/api-client"

// #228: deciding a friend request, shared by the friendship feature (the tab
// „Žádosti“, the profile) and the notification feature (the bell). Lives in
// lib/ so both use one call and one reading of its answers, without
// importing each other, like my-events-keys.ts.

// The roots of the queries a decision changes. The feature key files build
// on these, so what is refreshed here cannot drift from what they hold.
export const friendshipRootKey = ["friendship"] as const
export const notificationsRootKey = ["notifications"] as const
export const profileRootKey = ["profile"] as const
// #226: the events, where friends show (the detail, „Akce přátel“).
export const eventsRootKey = ["events"] as const

/**
 * What a decision refreshes: the requests and their number, the
 * notifications (the server marked the request's one read) and the profile
 * (the relation changed). Nothing else.
 */
export const FRIEND_REQUEST_DECISION_REFRESHES = [
  friendshipRootKey,
  notificationsRootKey,
  profileRootKey,
] as const

/**
 * #226: what removing a friend refreshes: the friends and the search (the
 * relation), the profile (the relation and the friend's events) and the
 * events, which no longer name the one removed.
 */
export const FRIEND_REMOVAL_REFRESHES = [friendshipRootKey, profileRootKey, eventsRootKey] as const

export type FriendRequestDecision = "accept" | "reject"

/** `stale`: nothing waited any more (decided elsewhere, withdrawn meanwhile). */
export type FriendRequestDecisionResult = "decided" | "stale"

/**
 * Accepts or rejects the pending request the person sent me; only the
 * recipient decides, the session on the server. A 409 is no failure but no
 * success either: the request is gone, and the caller says so.
 */
export async function decideFriendRequest(
  senderId: string,
  decision: FriendRequestDecision,
): Promise<FriendRequestDecisionResult> {
  try {
    await api.post(`friends/requests/${encodeURIComponent(senderId)}/${decision}`)
    return "decided"
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) return "stale"
    throw error
  }
}

/** The sentence for a request that was no longer there. */
export const FRIEND_REQUEST_STALE_MESSAGE = "friends.requests.stale"

/** The sentence for a failed decision: the account is gone (404), or try again. */
export function friendRequestDecisionErrorKey(error: unknown): string {
  return error instanceof HTTPError && error.response.status === 404
    ? "friends.requests.unavailable"
    : "friends.requests.decideError"
}

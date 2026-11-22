import type { ParseKeys } from "i18next"

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

/** One person's profile; `profileKeys.user` is this one. */
export const profileUserKey = (userId: string) => [...profileRootKey, "user", userId] as const

/**
 * What a decision refreshes: the requests and their number, the
 * notifications (the server marked the request's one read) and the profile
 * of the person who asked (the relation changed). Nothing else: not my own
 * profile, nor the others I visited (review #257).
 */
export const friendRequestDecisionRefreshes = (senderId: string) =>
  [friendshipRootKey, notificationsRootKey, profileUserKey(senderId)] as const

export type FriendRequestDecision = "accept" | "reject"

/**
 * Nothing waited any more (409: decided elsewhere, withdrawn meanwhile). A
 * failure, not a success (review #257): the request was not decided by this
 * click, and `isSuccess` must not say it was.
 */
export class StaleFriendRequestError extends Error {
  constructor() {
    super("The friend request is no longer pending")
    this.name = "StaleFriendRequestError"
  }
}

/**
 * Accepts or rejects the pending request the person sent me; only the
 * recipient decides, the session on the server. A 409 throws
 * `StaleFriendRequestError`: the request is gone, and the caller says so.
 */
export async function decideFriendRequest(
  senderId: string,
  decision: FriendRequestDecision,
): Promise<void> {
  try {
    await api.post(`friends/requests/${encodeURIComponent(senderId)}/${decision}`)
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) {
      throw new StaleFriendRequestError()
    }
    throw error
  }
}

/**
 * The sentences of a decision that did not happen, as typed keys (review
 * #257): a renamed key fails the type-check instead of showing the bare key.
 */
const FRIEND_REQUEST_DECISION_MESSAGES = {
  stale: "friends.requests.stale",
  unavailable: "friends.requests.unavailable",
  failed: "friends.requests.decideError",
} as const satisfies Record<string, ParseKeys>

/** The sentence for a request that was no longer there. */
export const FRIEND_REQUEST_STALE_MESSAGE = FRIEND_REQUEST_DECISION_MESSAGES.stale

/**
 * The sentence for a failed decision: nothing waited any more (409), the
 * account is gone (404), or try again.
 */
export function friendRequestDecisionErrorKey(
  error: unknown,
): (typeof FRIEND_REQUEST_DECISION_MESSAGES)[keyof typeof FRIEND_REQUEST_DECISION_MESSAGES] {
  if (error instanceof StaleFriendRequestError) return FRIEND_REQUEST_DECISION_MESSAGES.stale
  return error instanceof HTTPError && error.response.status === 404
    ? FRIEND_REQUEST_DECISION_MESSAGES.unavailable
    : FRIEND_REQUEST_DECISION_MESSAGES.failed
}

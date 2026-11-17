import { api, HTTPError } from "@/lib/api-client"

import {
  friendRelationResponseSchema,
  type FriendRelation,
} from "@/features/friendship/api/friendshipSchemas"

/**
 * #225: asks the person to become my friend. The sender is the session on the
 * server. A 409 means the state changed meanwhile (they asked me, we became
 * friends): that is no failure, the caller reloads the real state (`null`).
 */
export async function sendFriendRequest(recipientId: string): Promise<FriendRelation | null> {
  try {
    const response = friendRelationResponseSchema.parse(
      await api.post("friends/requests", { json: { recipientId } }).json(),
    )
    return response.relation
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) return null
    throw error
  }
}

/**
 * #225: takes back my pending request to the person. A 409 means there was
 * none any more (decided meanwhile): the caller reloads the real state (`null`).
 */
export async function withdrawFriendRequest(recipientId: string): Promise<FriendRelation | null> {
  try {
    const response = friendRelationResponseSchema.parse(
      await api.delete(`friends/requests/${encodeURIComponent(recipientId)}`).json(),
    )
    return response.relation
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) return null
    throw error
  }
}

/**
 * #226: ends the friendship with the person, for both of us; they are not
 * told. Already not friends (removed from another window) is no failure: the
 * server answers the same.
 */
export async function removeFriend(friendId: string): Promise<FriendRelation> {
  const response = friendRelationResponseSchema.parse(
    await api.delete(`friends/${encodeURIComponent(friendId)}`).json(),
  )
  return response.relation
}

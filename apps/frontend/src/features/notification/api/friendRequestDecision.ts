import { api, HTTPError } from "@/lib/api-client"

/** #228: what the recipient does with a friend request, from its notification. */
export type FriendRequestDecision = "accept" | "reject"

/**
 * #228: "Přijmout" / "Zamítnout" right in the notification. The friendship
 * feature has the same call; features do not import each other, so the bell
 * keeps its own. Only the recipient decides, the session on the server. A
 * 409 means nothing waits any more (decided elsewhere, withdrawn): no
 * failure, the list just loads the real state again.
 */
export async function decideFriendRequestFromNotification(
  senderId: string,
  decision: FriendRequestDecision,
): Promise<void> {
  try {
    await api.post(`friends/requests/${encodeURIComponent(senderId)}/${decision}`)
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 409) return
    throw error
  }
}

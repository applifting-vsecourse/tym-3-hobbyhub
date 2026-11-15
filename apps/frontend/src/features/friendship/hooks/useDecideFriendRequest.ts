import { useMutation, useQueryClient } from "@tanstack/react-query"

import { decideFriendRequest } from "@/features/friendship/api/friendshipRequests"
import type { FriendRequestDecision } from "@/features/friendship/api/friendshipSchemas"

type DecideFriendRequestOptions = {
  /** For a caller that holds its own data: the profile. */
  reload?: () => Promise<unknown>
  /**
   * Runs on a failure even when the caller is gone by then (a card that left
   * the list), unlike the callbacks passed to `mutate`.
   */
  onError?: (error: Error) => void
}

/**
 * #228: "Přijmout" / "Zamítnout" a request the person sent me. Whatever the
 * answer, everything on screen loads again: the requests and their number,
 * the profile, and the notifications, which the server marked read and which
 * this feature cannot name.
 */
export function useDecideFriendRequest(
  senderId: string,
  { reload, onError }: DecideFriendRequestOptions = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (decision: FriendRequestDecision) => decideFriendRequest(senderId, decision),
    onError,
    onSettled: () => Promise.all([reload?.(), queryClient.invalidateQueries()]),
  })
}

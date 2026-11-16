import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  decideFriendRequest,
  FRIEND_REQUEST_DECISION_REFRESHES,
  type FriendRequestDecision,
} from "@/lib/friend-requests"

type DecideFriendRequestOptions = {
  /** Nothing waited any more: say so. */
  onStale?: () => void
  /** The decision failed. */
  onError?: (error: Error) => void
}

/**
 * #228: "Přijmout" / "Zamítnout" a request the person sent me, wherever the
 * buttons are (the tab „Žádosti“, the profile, the bell). Whatever the answer,
 * the requests, the notifications and the profile load again, nothing more.
 * The callbacks are the mutation's own, so they run even when the buttons
 * are gone by then (a card that left the list).
 */
export function useDecideFriendRequest(
  senderId: string,
  { onStale, onError }: DecideFriendRequestOptions = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (decision: FriendRequestDecision) => decideFriendRequest(senderId, decision),
    onSuccess: (result) => {
      if (result === "stale") onStale?.()
    },
    onError,
    onSettled: () =>
      Promise.all(
        FRIEND_REQUEST_DECISION_REFRESHES.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  })
}

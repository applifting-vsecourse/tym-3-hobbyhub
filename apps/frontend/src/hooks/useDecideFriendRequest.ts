import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  decideFriendRequest,
  friendRequestDecisionRefreshes,
  StaleFriendRequestError,
  type FriendRequestDecision,
} from "@/lib/friend-requests"

type DecideFriendRequestOptions = {
  /** Nothing waited any more: say so. */
  onStale?: () => void
  /** The decision failed for another reason. */
  onError?: (error: Error) => void
}

/**
 * #228: "Přijmout" / "Zamítnout" a request the person sent me, wherever the
 * buttons are (the tab „Žádosti“, the profile, the bell). Whatever the answer,
 * the requests, the notifications and that person's profile load again,
 * nothing more. A request no longer waiting is a failure of its own
 * (`StaleFriendRequestError`), passed to `onStale`. The callbacks are the
 * mutation's own, so they run even when the buttons are gone by then (a card
 * that left the list).
 */
export function useDecideFriendRequest(
  senderId: string,
  { onStale, onError }: DecideFriendRequestOptions = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (decision: FriendRequestDecision) => decideFriendRequest(senderId, decision),
    onError: (error) => {
      if (error instanceof StaleFriendRequestError) onStale?.()
      else onError?.(error)
    },
    onSettled: () =>
      Promise.all(
        friendRequestDecisionRefreshes(senderId).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  })
}

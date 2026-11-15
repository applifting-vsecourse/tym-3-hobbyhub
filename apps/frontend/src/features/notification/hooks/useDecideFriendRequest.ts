import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  decideFriendRequestFromNotification,
  type FriendRequestDecision,
} from "@/features/notification/api/friendRequestDecision"

/**
 * #228: deciding a friend request from its notification. The server marks the
 * notification read; whatever the answer, everything on screen loads again:
 * the notifications and their number, and the requests and the profile,
 * which this feature cannot name.
 */
export function useDecideFriendRequest(senderId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (decision: FriendRequestDecision) =>
      decideFriendRequestFromNotification(senderId, decision),
    onSettled: () => queryClient.invalidateQueries(),
  })
}

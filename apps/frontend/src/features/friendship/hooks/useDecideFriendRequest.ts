import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { FriendRequestDecision } from "@/features/friendship/api/friendshipSchemas"
import { decideFriendRequest } from "@/features/friendship/api/friendshipRequests"

/**
 * #228: "Přijmout" / "Zamítnout" a request the person sent me. Whatever the
 * answer, everything on screen loads again: the requests and their number,
 * the profile, and the notifications, which the server marked read and which
 * this feature cannot name. `reload` is for a caller that holds its own data.
 */
export function useDecideFriendRequest(senderId: string, reload?: () => Promise<unknown>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (decision: FriendRequestDecision) => decideFriendRequest(senderId, decision),
    onSettled: () => Promise.all([reload?.(), queryClient.invalidateQueries()]),
  })
}

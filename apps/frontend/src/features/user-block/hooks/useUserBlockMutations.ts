import { useMutation, useQueryClient } from "@tanstack/react-query"

import { blockUser, unblockUser } from "@/features/user-block/api/userBlockRequests"

/**
 * #65, ADR-0028: a block quietly ends requests, seats, memberships and the
 * friendship between the two, and changes what either may ask for and whose
 * ratings and notifications count: most of what is cached (profiles, events,
 * groups, requests, friendships, notifications, ratings). So everything is
 * marked stale, which refetches only the queries on screen; the rest load
 * again when next used. The keys of other features are theirs to name
 * (import/no-restricted-paths), so they are not listed one by one here.
 *
 * Also after a failure: the block is written before the ties are undone, so a
 * request that failed halfway may still have changed them.
 */
function useUserBlockMutation(send: (userId: string) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSettled: () => queryClient.invalidateQueries(),
  })
}

export const useBlockUser = () => useUserBlockMutation(blockUser)

export const useUnblockUser = () => useUserBlockMutation(unblockUser)

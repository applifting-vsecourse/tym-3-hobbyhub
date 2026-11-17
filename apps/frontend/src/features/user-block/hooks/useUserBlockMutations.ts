import { useMutation, useQueryClient } from "@tanstack/react-query"

import { blockUser, unblockUser } from "@/features/user-block/api/userBlockRequests"

/**
 * #65, ADR-0028: a block quietly ends requests, seats, memberships and the
 * friendship between the two, and changes what either may ask for, so after
 * it nothing cached can be trusted: everything is fetched again.
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

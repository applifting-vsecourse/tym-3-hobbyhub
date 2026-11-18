import { useMutation, useQueryClient } from "@tanstack/react-query"

import { friendshipKeys } from "@/features/friendship/api/friendshipKeys"
import { withdrawFriendRequest } from "@/features/friendship/api/friendshipRequests"

/**
 * #225: "Zrušit žádost" on someone's profile. Whatever the answer, the profile
 * (`reloadProfile`) and the search reload, so they show the state the server holds.
 */
export function useWithdrawFriendRequest(userId: string, reloadProfile: () => Promise<unknown>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => withdrawFriendRequest(userId),
    onSettled: () =>
      Promise.all([
        reloadProfile(),
        queryClient.invalidateQueries({ queryKey: friendshipKeys.all() }),
      ]),
  })
}

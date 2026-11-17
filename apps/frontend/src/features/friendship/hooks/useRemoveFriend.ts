import { useMutation, useQueryClient } from "@tanstack/react-query"

import { FRIEND_REMOVAL_REFRESHES } from "@/lib/friend-requests"

import { removeFriend } from "@/features/friendship/api/friendshipRequests"

/**
 * #226: "Odebrat z přátel". Whatever the answer, the friends, the search, the
 * profile and the events reload, so none of them keeps showing the friend.
 */
export function useRemoveFriend(friendId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removeFriend(friendId),
    onSettled: () =>
      Promise.all(
        FRIEND_REMOVAL_REFRESHES.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  })
}

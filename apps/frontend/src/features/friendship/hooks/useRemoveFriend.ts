import { useMutation, useQueryClient } from "@tanstack/react-query"

import { friendRemovalRefreshes } from "@/lib/friend-requests"

import { removeFriend } from "@/features/friendship/api/friendshipRequests"

/**
 * #226: "Odebrat z přátel". Whatever the answer, the friends, the search, the
 * friend's profile and the events reload, so none of them keeps showing them.
 */
export function useRemoveFriend(friendId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removeFriend(friendId),
    onSettled: () =>
      Promise.all(
        friendRemovalRefreshes(friendId).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  })
}

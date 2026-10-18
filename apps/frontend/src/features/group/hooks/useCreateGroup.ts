import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createGroup } from "@/features/group/api/createGroup"
import { groupKeys } from "@/features/group/api/groupKeys"

export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGroup,
    onSuccess: (group) => {
      // The detail page opens next; give it the group without a second request.
      queryClient.setQueryData(groupKeys.detail(group.id), group)
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { groupKeys } from "@/features/group/api/groupKeys"
import {
  changeMemberRole,
  removeMember,
  transferOwnership,
} from "@/features/group/api/memberManagement"
import type { MemberAction } from "@/features/group/lib/memberActions"

export type MemberActionInput = { action: MemberAction; userId: string }

function runMemberAction(groupId: string, { action, userId }: MemberActionInput): Promise<unknown> {
  switch (action) {
    case "makeAdmin":
      return changeMemberRole({ groupId, userId, role: "ADMIN" })
    case "demote":
      return changeMemberRole({ groupId, userId, role: "MEMBER" })
    case "transfer":
      return transferOwnership({ groupId, userId })
    case "remove":
      return removeMember({ groupId, userId })
  }
}

/**
 * One mutation for every member action (F-07.3b). Settled either way, it
 * refreshes the group: the members, the count and the user's own role all
 * hang under its detail key, and "Moje skupiny" shows the role too. A
 * refusal usually means another admin got there first.
 */
export function useMemberAction(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MemberActionInput) => runMemberAction(groupId, input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
        queryClient.invalidateQueries({ queryKey: groupKeys.lists() }),
      ]),
  })
}

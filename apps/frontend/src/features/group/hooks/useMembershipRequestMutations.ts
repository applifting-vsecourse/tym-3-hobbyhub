import { useMutation, useQueryClient } from "@tanstack/react-query"

import { groupKeys } from "@/features/group/api/groupKeys"
import {
  decideMembershipRequest,
  requestMembership,
  withdrawMembershipRequest,
} from "@/features/group/api/membershipRequestMutations"

// Everything about the group hangs under its detail key: the member count,
// the user's own state, the admins' requests and members. A refusal refreshes
// too: it usually means another window or another admin got there first.
function useRefreshGroup() {
  const queryClient = useQueryClient()
  return (groupId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() }),
    ])
}

export function useRequestMembership() {
  const refresh = useRefreshGroup()
  return useMutation({
    mutationFn: requestMembership,
    onSettled: (_data, _error, input) => refresh(input.groupId),
  })
}

export function useWithdrawMembershipRequest() {
  const refresh = useRefreshGroup()
  return useMutation({
    mutationFn: withdrawMembershipRequest,
    onSettled: (_data, _error, groupId) => refresh(groupId),
  })
}

export function useDecideMembershipRequest() {
  const refresh = useRefreshGroup()
  return useMutation({
    mutationFn: decideMembershipRequest,
    onSettled: (_data, _error, input) => refresh(input.groupId),
  })
}

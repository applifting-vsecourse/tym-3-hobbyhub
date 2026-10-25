import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { groupKeys } from "@/features/group/api/groupKeys"
import { groupMembershipQueryOptions } from "@/features/group/api/groupMembershipQueryOptions"
import { leaveGroup } from "@/features/group/api/leaveGroup"
import { useJoinRequest } from "@/features/group/hooks/useJoinRequest"

/** What the membership panel of a group shows. */
export type MembershipView = "visitor" | "loading" | "canRequest" | "pending" | "member"

/**
 * Combines who is looking (signed in or not), whether they are already a member
 * and the stand-in join request (see `useJoinRequest`). The caller owns the
 * session, so this feature does not depend on the auth one.
 */
export function useGroupMembershipState(
  groupId: string,
  session: { isSignedIn: boolean; isPending: boolean },
) {
  const queryClient = useQueryClient()
  const joinRequest = useJoinRequest()
  const membership = useQuery({
    ...groupMembershipQueryOptions(groupId),
    enabled: session.isSignedIn,
  })

  // Refetches the member count and the user's own state.
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
  })
  const isSimulatedMember = joinRequest.state === "accepted"
  // The membership query is off while signed out, but its cached answer stays
  // (signing out does not clear the cache), so it only counts while signed in.
  const myMembership = session.isSignedIn ? membership.data : undefined

  let view: MembershipView
  if (joinRequest.state === "accepted" || myMembership?.isMember) view = "member"
  else if (joinRequest.state === "pending") view = "pending"
  else if (session.isSignedIn) view = membership.isPending ? "loading" : "canRequest"
  else view = session.isPending ? "loading" : "visitor"

  return {
    view,
    secondsLeft: joinRequest.secondsLeft,
    request: joinRequest.request,
    cancel: joinRequest.cancel,
    /** The owner stays: a group needs one, and handing it over comes later. */
    canLeave: view === "member" && (isSimulatedMember || myMembership?.role !== "OWNER"),
    /** Resolves when the user has left; rejects when the server refuses. */
    leave: async () => {
      // The stand-in membership was never stored, so there is nothing to delete.
      if (isSimulatedMember) joinRequest.cancel()
      else await leaveMutation.mutateAsync()
    },
    isLeaving: leaveMutation.isPending,
    leaveFailed: leaveMutation.isError,
    resetLeave: leaveMutation.reset,
    /** A request that went through counts as one more member, until reload. */
    extraMembers: joinRequest.state === "accepted" ? 1 : 0,
  }
}

export type GroupMembershipState = ReturnType<typeof useGroupMembershipState>

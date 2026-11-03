import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { groupKeys } from "@/features/group/api/groupKeys"
import { groupMembershipQueryOptions } from "@/features/group/api/groupMembershipQueryOptions"
import { hasGroupAdminRights } from "@/features/group/api/groupSchemas"
import { leaveGroup } from "@/features/group/api/leaveGroup"
import { myMembershipRequestQueryOptions } from "@/features/group/api/membershipRequestQueryOptions"

/** What the membership panel of a group shows. */
export type MembershipView =
  "visitor" | "loading" | "canRequest" | "pending" | "rejected" | "member"

/**
 * Combines who is looking (signed in or not), whether they are a member, and
 * their own request to join (F-07.3). The caller owns the session, so this
 * feature does not depend on the auth one.
 */
export function useGroupMembershipState(
  groupId: string,
  session: { userId: string | null; isPending: boolean },
) {
  const queryClient = useQueryClient()
  const isSignedIn = session.userId !== null
  const membership = useQuery({
    ...groupMembershipQueryOptions(groupId),
    enabled: isSignedIn,
  })
  const myRequest = useQuery({
    ...myMembershipRequestQueryOptions(groupId, session.userId ?? ""),
    enabled: isSignedIn,
  })

  // Refetches the member count and the user's own state.
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
  })
  // The membership query is off while signed out, but its cached answer stays
  // (signing out does not clear the cache), so it only counts while signed in.
  const myMembership = isSignedIn ? membership.data : undefined
  const myRequestState = isSignedIn ? myRequest.data : undefined

  let view: MembershipView
  if (myMembership?.isMember) view = "member"
  else if (isSignedIn) {
    if (membership.isPending || myRequest.isPending) view = "loading"
    else if (myRequestState?.request?.status === "PENDING") view = "pending"
    // A rejection is final for the group (ADR-0014).
    else if (myRequestState?.violations.includes("REJECTED_BEFORE")) view = "rejected"
    else view = "canRequest"
  } else view = session.isPending ? "loading" : "visitor"

  return {
    view,
    /** OWNER or ADMIN: sees the requests and the members (F-07.3). */
    isAdmin: hasGroupAdminRights(myMembership?.role),
    /** The owner stays: a group needs one, and handing it over comes later (#94). */
    canLeave: view === "member" && myMembership?.role !== "OWNER",
    /** What the server says the admins will see of the user; undefined until known. */
    applicant: myRequestState?.applicant,
    /** Resolves when the user has left; rejects when the server refuses. */
    leave: () => leaveMutation.mutateAsync(),
    isLeaving: leaveMutation.isPending,
    leaveFailed: leaveMutation.isError,
    resetLeave: leaveMutation.reset,
  }
}

export type GroupMembershipState = ReturnType<typeof useGroupMembershipState>

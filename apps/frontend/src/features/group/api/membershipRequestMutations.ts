import { api, HTTPError } from "@/lib/api-client"

import {
  membershipRefusalSchema,
  membershipRequestSchema,
  type MembershipDecisionViolation,
  type MembershipRequest,
  type MembershipRuleViolation,
} from "@/features/group/api/membershipRequestSchemas"

/** The server refused for a reason the page can explain. */
export class MembershipRefusedError extends Error {
  constructor(readonly violations: (MembershipRuleViolation | MembershipDecisionViolation)[]) {
    super(violations.join(", "))
    this.name = "MembershipRefusedError"
  }
}

// A 400 with `violations` becomes a MembershipRefusedError; anything else stays.
async function withRefusal<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send()
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 400) {
      // ky has already read the body into `error.data`; the response itself
      // can no longer be read.
      const refusal = membershipRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new MembershipRefusedError(refusal.data.violations)
    }
    throw error
  }
}

export function requestMembership(input: {
  groupId: string
  message?: string
}): Promise<MembershipRequest> {
  return withRefusal(async () =>
    membershipRequestSchema.parse(
      await api
        .post(`groups/${input.groupId}/requests`, { json: { message: input.message } })
        .json(),
    ),
  )
}

export async function withdrawMembershipRequest(groupId: string): Promise<void> {
  await api.delete(`groups/${groupId}/requests/mine`)
}

export type MembershipDecision =
  | { groupId: string; requestId: string; decision: "approve" }
  | { groupId: string; requestId: string; decision: "reject"; reason?: string }

export function decideMembershipRequest(input: MembershipDecision): Promise<MembershipRequest> {
  const url = `groups/${input.groupId}/requests/${input.requestId}/${input.decision}`
  const json = input.decision === "reject" ? { reason: input.reason } : {}
  return withRefusal(async () =>
    membershipRequestSchema.parse(await api.post(url, { json }).json()),
  )
}

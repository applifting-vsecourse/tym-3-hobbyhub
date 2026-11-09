import { api } from "@/lib/api-client"

import { groupMemberSchema, type GroupMember } from "@/features/group/api/membershipRequestSchemas"

// F-07.3b member management; the server decides who may do what (ADR-0007).

export async function removeMember(input: { groupId: string; userId: string }): Promise<void> {
  await api.delete(`groups/${input.groupId}/members/${input.userId}`)
}

export async function changeMemberRole(input: {
  groupId: string
  userId: string
  role: "ADMIN" | "MEMBER"
}): Promise<GroupMember> {
  return groupMemberSchema.parse(
    await api
      .patch(`groups/${input.groupId}/members/${input.userId}`, { json: { role: input.role } })
      .json(),
  )
}

export async function transferOwnership(input: { groupId: string; userId: string }): Promise<void> {
  await api.post(`groups/${input.groupId}/ownership`, { json: { userId: input.userId } })
}

import { api } from "@/lib/api-client"

import { groupSchema, type Group, type UpdateGroupInput } from "@/features/group/api/groupSchemas"

export async function updateGroup(groupId: string, input: UpdateGroupInput): Promise<Group> {
  return groupSchema.parse(await api.patch(`groups/${groupId}`, { json: input }).json())
}

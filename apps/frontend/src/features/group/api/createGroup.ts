import { api } from "@/lib/api-client"

import { groupSchema, type CreateGroupInput, type Group } from "@/features/group/api/groupSchemas"

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const json = await api.post("groups", { json: input }).json()
  return groupSchema.parse(json)
}

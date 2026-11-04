import { api } from "@/lib/api-client"
import { rethrowEmailNotVerified } from "@/lib/emailNotVerified"

import { groupSchema, type CreateGroupInput, type Group } from "@/features/group/api/groupSchemas"

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  try {
    const json = await api.post("groups", { json: input }).json()
    return groupSchema.parse(json)
  } catch (error) {
    // F-03.2: founding a group needs a verified e-mail.
    rethrowEmailNotVerified(error)
  }
}

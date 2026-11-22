import { api } from "@/lib/api-client"
import { rethrowEmailNotVerified } from "@/lib/emailNotVerified"

/** Joins a group that lets anyone in; the others are asked to join with a request. */
export async function joinOpenGroup(groupId: string): Promise<void> {
  try {
    await api.post(`groups/${groupId}/requests/join`)
  } catch (error) {
    rethrowEmailNotVerified(error)
  }
}

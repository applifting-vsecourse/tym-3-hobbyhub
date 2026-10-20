import { api } from "@/lib/api-client"

export async function leaveGroup(groupId: string): Promise<void> {
  await api.delete(`groups/${groupId}/membership`)
}

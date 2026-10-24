import { api } from "@/lib/api-client"

export async function withdrawRequest(eventId: string): Promise<void> {
  await api.delete(`events/${eventId}/requests/mine`)
}

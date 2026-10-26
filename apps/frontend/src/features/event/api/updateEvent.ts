import { api } from "@/lib/api-client"

import {
  eventSchema,
  type CancelEventInput,
  type CreateEventInput,
  type Event,
} from "@/features/event/api/eventSchemas"

export async function updateEvent(id: string, input: CreateEventInput): Promise<Event> {
  const json = await api.patch(`events/${id}`, { json: input }).json()
  return eventSchema.parse(json)
}

export async function cancelEvent(id: string, input: CancelEventInput): Promise<Event> {
  const json = await api.post(`events/${id}/cancel`, { json: input }).json()
  return eventSchema.parse(json)
}

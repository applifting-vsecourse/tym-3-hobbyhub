import { api } from "@/lib/api-client"

import { eventSchema, type CreateEventInput, type Event } from "@/features/event/api/eventSchemas"

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const json = await api.post("events", { json: input }).json()
  return eventSchema.parse(json)
}

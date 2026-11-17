import { api } from "@/lib/api-client"
import { rethrowEmailNotVerified } from "@/lib/emailNotVerified"

import { eventSchema, type CreateEventInput, type Event } from "@/features/event/api/eventSchemas"

// #218: a new event is always at a place, so its kind is not sent (the API
// refuses it); only an edit says it.
export async function createEvent({
  venueType: _venueType,
  ...input
}: CreateEventInput): Promise<Event> {
  try {
    const json = await api.post("events", { json: input }).json()
    return eventSchema.parse(json)
  } catch (error) {
    // F-03.2: publishing needs a verified e-mail.
    rethrowEmailNotVerified(error)
  }
}

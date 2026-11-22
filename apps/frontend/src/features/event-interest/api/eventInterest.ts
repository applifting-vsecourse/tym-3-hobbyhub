import { api } from "@/lib/api-client"

import {
  eventInterestStateSchema,
  type EventInterestState,
} from "@/features/event-interest/api/eventInterestSchemas"

/** Idempotent: saving an event that is already on the list keeps it there once. */
export async function saveEventInterest(eventId: string): Promise<EventInterestState> {
  return eventInterestStateSchema.parse(await api.put(`events/${eventId}/interest`).json())
}

/**
 * Idempotent, and allowed whatever happened to the event since.
 * `shouldKeepAlive` lets the request outlive a closing tab.
 */
export async function removeEventInterest(
  eventId: string,
  { shouldKeepAlive = false }: { shouldKeepAlive?: boolean } = {},
): Promise<void> {
  await api.delete(`events/${eventId}/interest`, { keepalive: shouldKeepAlive })
}

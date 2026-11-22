import { api, HTTPError } from "@/lib/api-client"

import {
  eventInterestStateSchema,
  watchRefusalSchema,
  type EventInterestState,
  type WatchRuleViolation,
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

/** #232: the server refused to start watching; `violations` says why. */
export class WatchRefusedError extends Error {
  constructor(readonly violations: WatchRuleViolation[]) {
    super(violations.join(", "))
    this.name = "WatchRefusedError"
  }
}

/** #232: watch the full event for a free seat; saves it to the list too. Idempotent. */
export async function watchFreeSpot(eventId: string): Promise<EventInterestState> {
  try {
    return eventInterestStateSchema.parse(await api.put(`events/${eventId}/interest/watch`).json())
  } catch (error) {
    // ky has already read the body into `error.data`.
    if (error instanceof HTTPError && error.response.status === 400) {
      const refusal = watchRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new WatchRefusedError(refusal.data.violations)
    }
    throw error
  }
}

/** #232: stop watching; the event stays on the list. Idempotent, never refused. */
export async function unwatchFreeSpot(eventId: string): Promise<void> {
  await api.delete(`events/${eventId}/interest/watch`)
}

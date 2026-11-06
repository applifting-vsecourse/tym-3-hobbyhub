import { z } from "zod"

import { api, HTTPError } from "@/lib/api-client"

// Why the server refuses the new number (F-05.6).
export const externalSpotsViolationSchema = z.enum(["EVENT_NOT_CHANGEABLE", "MAX_BELOW_OCCUPIED"])
export type ExternalSpotsViolation = z.infer<typeof externalSpotsViolationSchema>

const refusalSchema = z.object({ violations: z.array(externalSpotsViolationSchema) })

/** The server refused the change for a reason the page can explain. */
export class ExternalSpotsRefusedError extends Error {
  constructor(readonly violations: ExternalSpotsViolation[]) {
    super(violations.join(", "))
    this.name = "ExternalSpotsRefusedError"
  }
}

/**
 * The seats of people outside the app. The changed event comes back, but the
 * page reads it from its own query, refreshed after the save.
 */
export async function updateExternalSpots(eventId: string, externalOccupiedSpots: number) {
  try {
    await api.patch(`events/${eventId}/external-occupied-spots`, {
      json: { externalOccupiedSpots },
    })
  } catch (error) {
    // ky has already read the body into `error.data`.
    if (error instanceof HTTPError && error.response.status === 400) {
      const refusal = refusalSchema.safeParse(error.data)
      if (refusal.success) throw new ExternalSpotsRefusedError(refusal.data.violations)
    }
    throw error
  }
}

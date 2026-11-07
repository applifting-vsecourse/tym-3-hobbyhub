import { api, HTTPError } from "@/lib/api-client"

import {
  cancelRefusalSchema,
  type CancelRuleViolation,
} from "@/features/participation-request/api/participationRequestSchemas"

/** The server kept the seat for a reason the page can explain, e.g. the event started. */
export class CancelRefusedError extends Error {
  constructor(readonly violations: CancelRuleViolation[]) {
    super(violations.join(", "))
    this.name = "CancelRefusedError"
  }
}

export type CancelParticipationInput = { eventId: string; message: string }

/** F-06.4: give the signed-in person's seat back, with a message to the organizers. */
export async function cancelParticipation({
  eventId,
  message,
}: CancelParticipationInput): Promise<void> {
  try {
    await api.post(`events/${eventId}/participations/mine/cancel`, { json: { message } })
  } catch (error) {
    // ky has already read the body into `error.data`.
    if (error instanceof HTTPError && error.response.status === 400) {
      const refusal = cancelRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new CancelRefusedError(refusal.data.violations)
    }
    throw error
  }
}

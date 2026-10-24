import { api, HTTPError } from "@/lib/api-client"

import {
  decisionRefusalSchema,
  participationRequestSchema,
  type DecisionRuleViolation,
  type ParticipationRequest,
} from "@/features/participation-request/api/participationRequestSchemas"

/** The server refused the decision for a reason the page can explain. */
export class DecisionRefusedError extends Error {
  constructor(readonly violations: DecisionRuleViolation[]) {
    super(violations.join(", "))
    this.name = "DecisionRefusedError"
  }
}

export type DecisionInput = { eventId: string; requestId: string }

async function decide(path: string, body?: { reason?: string }): Promise<ParticipationRequest> {
  try {
    return participationRequestSchema.parse(await api.post(path, { json: body ?? {} }).json())
  } catch (error) {
    // ky has already read the body into `error.data`; the response itself can
    // no longer be read.
    if (error instanceof HTTPError && error.response.status === 400) {
      const refusal = decisionRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new DecisionRefusedError(refusal.data.violations)
    }
    throw error
  }
}

export function approveRequest({ eventId, requestId }: DecisionInput) {
  return decide(`events/${eventId}/requests/${requestId}/approve`)
}

export function rejectRequest({ eventId, requestId, reason }: DecisionInput & { reason?: string }) {
  return decide(`events/${eventId}/requests/${requestId}/reject`, { reason })
}

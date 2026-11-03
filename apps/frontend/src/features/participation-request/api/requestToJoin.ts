import { api, HTTPError } from "@/lib/api-client"

import {
  participationRequestSchema,
  refusalSchema,
  type JoinRuleViolation,
  type ParticipationRequest,
  type RequestToJoinInput,
} from "@/features/participation-request/api/participationRequestSchemas"

/** The server refused the request for a reason the page can explain. */
export class JoinRefusedError extends Error {
  constructor(readonly violations: JoinRuleViolation[]) {
    super(violations.join(", "))
    this.name = "JoinRefusedError"
  }
}

export async function requestToJoin({
  eventId,
  message,
}: RequestToJoinInput): Promise<ParticipationRequest> {
  try {
    const json = await api.post(`events/${eventId}/requests`, { json: { message } }).json()
    return participationRequestSchema.parse(json)
  } catch (error) {
    // ky has already read the body into `error.data`; the response itself can
    // no longer be read.
    if (error instanceof HTTPError && error.response.status === 400) {
      const refusal = refusalSchema.safeParse(error.data)
      if (refusal.success) throw new JoinRefusedError(refusal.data.violations)
    }
    throw error
  }
}

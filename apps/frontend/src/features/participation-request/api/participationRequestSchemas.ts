import { z } from "zod"

// Mirrors the server-side DTO, so the form can tell the user before sending.
export const PARTICIPATION_REQUEST_MESSAGE_MAX = 500

export const requestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
  "CLOSED",
])

// Why the server refuses a new request; the same rules the panel explains.
export const joinRuleViolationSchema = z.enum([
  "EVENT_CANCELLED",
  "EVENT_STARTED",
  "EVENT_FULL",
  "IS_ORGANIZER",
  "HAS_SEAT",
  "ALREADY_REQUESTED",
  "REJECTED_BEFORE",
])

export const participationRequestSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  status: requestStatusSchema,
  message: z.string().nullable(),
  requestedAt: z.coerce.date(),
})

export const myRequestStateSchema = z.object({
  request: participationRequestSchema.nullable(),
  violations: z.array(joinRuleViolationSchema),
})

// The body of a refused request (400); a broken message has no `violations`.
export const refusalSchema = z.object({
  violations: z.array(joinRuleViolationSchema),
})

export type RequestStatus = z.infer<typeof requestStatusSchema>
export type JoinRuleViolation = z.infer<typeof joinRuleViolationSchema>
export type ParticipationRequest = z.infer<typeof participationRequestSchema>
export type MyRequestState = z.infer<typeof myRequestStateSchema>
export type RequestToJoinInput = { eventId: string; message?: string }

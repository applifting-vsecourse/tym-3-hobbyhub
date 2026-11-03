import { z } from "zod"

// Mirror the server-side DTOs, so the forms can tell the user before sending.
export const PARTICIPATION_REQUEST_MESSAGE_MAX = 500
export const PARTICIPATION_REQUEST_REJECTION_REASON_MAX = 500

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
  "EVENT_NOT_HELD",
  "EVENT_FINISHED",
  "EVENT_STARTED",
  "EVENT_FULL",
  "IS_ORGANIZER",
  "HAS_SEAT",
  "ALREADY_REQUESTED",
  "REJECTED_BEFORE",
])

// Why the server refuses to approve or reject a request (F-05.7).
export const decisionRuleViolationSchema = z.enum([
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_FINISHED",
  "EVENT_STARTED",
  "EVENT_FULL",
  "NOT_PENDING",
  "APPLICANT_HAS_SEAT",
])

// What the organizer sees of the person asking; the request form shows the
// applicant the same.
export const applicantProfileSchema = z.object({
  name: z.string(),
  image: z.string().nullable(),
  bio: z.string().nullable(),
  hasVerifiedEmail: z.boolean(),
})

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
  applicant: applicantProfileSchema,
})

export const pendingRequestSchema = participationRequestSchema.extend({
  applicant: applicantProfileSchema,
})

export const pendingRequestPageSchema = z.object({
  items: z.array(pendingRequestSchema),
  total: z.number(),
})

// The body of a refused request (400); a broken message has no `violations`.
export const refusalSchema = z.object({
  violations: z.array(joinRuleViolationSchema),
})

export const decisionRefusalSchema = z.object({
  violations: z.array(decisionRuleViolationSchema),
})

export type RequestStatus = z.infer<typeof requestStatusSchema>
export type JoinRuleViolation = z.infer<typeof joinRuleViolationSchema>
export type DecisionRuleViolation = z.infer<typeof decisionRuleViolationSchema>
export type ApplicantProfile = z.infer<typeof applicantProfileSchema>
export type PendingRequest = z.infer<typeof pendingRequestSchema>
export type ParticipationRequest = z.infer<typeof participationRequestSchema>
export type MyRequestState = z.infer<typeof myRequestStateSchema>
export type RequestToJoinInput = { eventId: string; message?: string }
export type ApprovalMode = "MANUAL" | "AUTOMATIC"

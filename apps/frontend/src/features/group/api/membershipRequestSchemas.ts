import { z } from "zod"

import { groupRoleSchema } from "@/features/group/api/groupSchemas"

// Mirror the server-side DTOs, so the forms can tell the user before sending.
export const MEMBERSHIP_REQUEST_MESSAGE_MAX = 500
export const MEMBERSHIP_REJECTION_REASON_MAX = 500

export const membershipRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
  "CLOSED",
])

// Why the server refuses a new request; the same rules the panel explains.
export const membershipRuleViolationSchema = z.enum([
  "IS_MEMBER",
  "ALREADY_REQUESTED",
  "REJECTED_BEFORE",
])

// Why an admin cannot decide a request now.
export const membershipDecisionViolationSchema = z.enum([
  "GROUP_CANCELLED",
  "NOT_PENDING",
  "APPLICANT_IS_MEMBER",
])

export const membershipRequestSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  status: membershipRequestStatusSchema,
  message: z.string().nullable(),
  requestedAt: z.coerce.date(),
})

export const myMembershipRequestStateSchema = z.object({
  request: membershipRequestSchema.nullable(),
  violations: z.array(membershipRuleViolationSchema),
})

/** What the admins see of the person asking. */
export const applicantSchema = z.object({
  name: z.string(),
  image: z.string().nullable(),
  bio: z.string().nullable(),
  hasVerifiedEmail: z.boolean(),
})

export const pendingMembershipRequestSchema = membershipRequestSchema.extend({
  applicant: applicantSchema,
})

export const groupMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  role: groupRoleSchema,
  joinedAt: z.coerce.date(),
})

// The body of a refused request (400); a broken message has no `violations`.
export const membershipRefusalSchema = z.object({
  violations: z.array(z.union([membershipRuleViolationSchema, membershipDecisionViolationSchema])),
})

export type MembershipRequest = z.infer<typeof membershipRequestSchema>
export type MembershipRuleViolation = z.infer<typeof membershipRuleViolationSchema>
export type MembershipDecisionViolation = z.infer<typeof membershipDecisionViolationSchema>
export type MyMembershipRequestState = z.infer<typeof myMembershipRequestStateSchema>
export type PendingMembershipRequest = z.infer<typeof pendingMembershipRequestSchema>
export type GroupMember = z.infer<typeof groupMemberSchema>

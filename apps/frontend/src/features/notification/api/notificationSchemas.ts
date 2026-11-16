import { z } from "zod"

// Mirror of the server's NotificationResponseDto (#152, ADR-0015): the type
// and the data, never the text. The client writes the sentence.
export const notificationTypeSchema = z.enum([
  "NEW_REQUESTS",
  "PARTICIPANT_CANCELLED",
  "REQUEST_DECIDED",
  "CONFIRMATION_PROMPT",
  "SPOT_AVAILABLE",
  "GROUP_INVITATION",
  "EVENT_BOARD",
  "ONBOARDING_SERIES",
  "MONTHLY_RECOMMENDATION",
  "EVENT_CHANGED",
  "EVENT_CANCELLED",
  "EVENT_HIDDEN",
  "EVENT_RESTORED",
  // #240: a report the recipient filed was dealt with; says nothing of how.
  "REPORT_RESOLVED",
  "EVENT_REMINDER",
  "HOSTED_EVENT_REMINDER",
  "FRIEND_REQUEST",
  "FRIEND_REQUEST_ACCEPTED",
])

// #175: the kinds the notification page filters by, as the server names them
// (NOTIFICATION_KINDS). Which types each holds is the server's business: the
// client sends the kind, the server filters (`domain/notification.ts`).
export const notificationKindSchema = z.enum(["requests", "events", "groups", "other"])
export const NOTIFICATION_KINDS = notificationKindSchema.options

export const decisionSchema = z.enum(["APPROVED", "REJECTED"])
export const eventChangeSchema = z.enum(["TIME", "PLACE"])

// #233: which reminder before the start, the start it was for, and for the
// organizers how full the event was when it went out.
export const reminderSchema = z.object({
  kind: z.enum(["DAY", "TWO_HOURS"]),
  startsAt: z.coerce.date(),
  occupancy: z
    .object({
      occupiedSpots: z.number(),
      maxParticipants: z.number(),
      missingToMinimum: z.number(),
    })
    .nullable(),
})

// #228: the friend request a notification is about, and where it stands now.
export const friendRequestStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"])

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  createdAt: z.coerce.date(),
  readAt: z.coerce.date().nullable(),
  actor: z.object({ id: z.string(), name: z.string() }).nullable(),
  event: z.object({ id: z.string(), title: z.string() }).nullable(),
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
  friendRequest: z.object({ id: z.string(), status: friendRequestStatusSchema }).nullable(),
  decision: decisionSchema.nullable(),
  message: z.string().nullable(),
  changes: z.array(eventChangeSchema),
  /** EVENT_HIDDEN: why an administrator hid it; only the organizers' copy has it (#239). */
  reason: z.string().nullable(),
  reminder: reminderSchema.nullable(),
})

export const notificationPageSchema = z.object({
  items: z.array(notificationSchema),
  total: z.number(),
})

export const notificationCountSchema = z.object({ count: z.number() })

export type NotificationType = z.infer<typeof notificationTypeSchema>
export type NotificationKind = z.infer<typeof notificationKindSchema>
export type Notification = z.infer<typeof notificationSchema>
export type NotificationPage = z.infer<typeof notificationPageSchema>

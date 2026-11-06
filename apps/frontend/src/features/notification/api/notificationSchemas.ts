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
])

// #175: the kinds the notification page filters by, as the server names them
// (NOTIFICATION_KINDS). Which types each holds: `lib/notificationKinds.ts`.
export const notificationKindSchema = z.enum(["requests", "events", "groups", "other"])
export const NOTIFICATION_KINDS = notificationKindSchema.options

export const decisionSchema = z.enum(["APPROVED", "REJECTED"])
export const eventChangeSchema = z.enum(["TIME", "PLACE"])

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  createdAt: z.coerce.date(),
  readAt: z.coerce.date().nullable(),
  actor: z.object({ id: z.string(), name: z.string() }).nullable(),
  event: z.object({ id: z.string(), title: z.string() }).nullable(),
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
  decision: decisionSchema.nullable(),
  message: z.string().nullable(),
  changes: z.array(eventChangeSchema),
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

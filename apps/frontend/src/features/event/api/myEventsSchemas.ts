import { z } from "zod"

import { eventListItemSchema } from "@/features/event/api/eventSchemas"

/** An event the person organizes; only this list holds one an administrator hid (#239). */
export const hostedEventSchema = eventListItemSchema.extend({
  isHidden: z.boolean(),
})

export type HostedEvent = z.infer<typeof hostedEventSchema>

export const hostedEventsPageSchema = z.object({
  items: z.array(hostedEventSchema),
  /** All events the person organizes that match the filter, not just this page. */
  total: z.number(),
})

// WITHDRAWN: the person cancelled the request or gave up the seat.
// EVENT_CANCELLED: the organizer called the event off.
export const applicationStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
  "EVENT_CANCELLED",
])

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>

export const myApplicationSchema = z.object({
  status: applicationStatusSchema,
  event: eventListItemSchema,
})

export type MyApplication = z.infer<typeof myApplicationSchema>

/** A page of applications: waiting and approved ones to events still on first, then the rest. */
export const myApplicationsPageSchema = z.object({
  items: z.array(myApplicationSchema),
  /** All applications that match the filter, not just this page. */
  total: z.number(),
  /** Where the next page starts; null on the last one. */
  nextOffset: z.number().nullable(),
})

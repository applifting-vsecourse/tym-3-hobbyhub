import { z } from "zod"

import { eventListItemSchema } from "@/features/event/api/eventSchemas"

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

/** A page of applications to events that are not over, soonest first. */
export const myApplicationsPageSchema = z.object({
  items: z.array(myApplicationSchema),
  /** All upcoming applications, not just this page. */
  total: z.number(),
})

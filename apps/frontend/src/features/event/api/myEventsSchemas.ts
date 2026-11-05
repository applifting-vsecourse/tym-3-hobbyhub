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

export const myEventsSchema = z.object({
  /** Applications to events that are not over, soonest first. */
  applications: z.array(z.object({ status: applicationStatusSchema, event: eventListItemSchema })),
  /** Events the person organizes that are not over, soonest first. */
  hosted: z.array(eventListItemSchema),
})

export type MyEvents = z.infer<typeof myEventsSchema>
export type MyApplication = MyEvents["applications"][number]

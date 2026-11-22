import { z } from "zod"

import { eventListItemSchema } from "@/features/event/api/eventSchemas"

/** An event the person organizes; only this list holds one an administrator hid (#239). */
export const hostedEventSchema = eventListItemSchema.extend({
  isHidden: z.boolean(),
  /** #235: participants the organizer may still rate; 0 when nobody or the period is not on. */
  participantsToRate: z.number().int(),
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
  /** The event is over and the person may still rate its organizer (#234). */
  canRateOrganizer: z.boolean(),
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

/**
 * #231: where an event on the "Zajímá mě" list stands. UPCOMING while it is on
 * (it may have started); PAST once it is over; CANCELLED when called off.
 */
export const interestedEventStateSchema = z.enum(["UPCOMING", "PAST", "CANCELLED"])

export type InterestedEventState = z.infer<typeof interestedEventStateSchema>

/**
 * An event on the person's "Zajímá mě" list: the card of the event list and
 * where it stands; #232 whether they watch it for a free seat, and whether
 * they may start to now.
 */
export const interestedEventSchema = eventListItemSchema.extend({
  state: interestedEventStateSchema,
  watchesFreeSpot: z.boolean(),
  canWatchFreeSpot: z.boolean(),
})

export type InterestedEvent = z.infer<typeof interestedEventSchema>

/** A page of the list: what is still on first, soonest first; then the rest, latest first. */
export const interestedEventsPageSchema = z.object({
  items: z.array(interestedEventSchema),
  /** All saved events the person may still see that match the filter. */
  total: z.number(),
})

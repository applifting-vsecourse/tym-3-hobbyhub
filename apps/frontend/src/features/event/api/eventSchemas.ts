import { z } from "zod"

export const eventListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().nullable(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  venueType: z.enum(["PUBLIC_VENUE", "PRIVATE_VENUE", "ONLINE"]),
  // Only approximate: the API sends no street, and no name for private venues.
  placeName: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  level: z.string().nullable(),
  // Key of the icon in `ACTIVITIES`; unknown keys are possible.
  activity: z.object({ id: z.string(), name: z.string(), icon: z.string() }),
  /** People needed for the event to happen. */
  minParticipants: z.number(),
  maxParticipants: z.number(),
  takenCount: z.number(),
})

export const eventListSchema = z.object({
  items: z.array(eventListItemSchema),
  /** All upcoming public events, not just this page. */
  total: z.number(),
})

export type EventListItem = z.infer<typeof eventListItemSchema>

export const participantStatsSchema = z.object({
  /** Registered approved participants the figures rest on. */
  included: z.number(),
  /** All taken seats, including people outside the app. */
  total: z.number(),
  medianAge: z.number().nullable(),
  gender: z.object({ male: z.number(), female: z.number() }).nullable(),
})

export const eventDetailSchema = eventListItemSchema.extend({
  description: z.string(),
  equipment: z.string().nullable(),
  /** In CZK, information only. */
  contributionAmount: z.number().nullable(),
  status: z.enum(["PUBLISHED", "CANCELLED", "FINISHED", "NOT_HELD"]),
  approvalMode: z.enum(["MANUAL", "AUTOMATIC"]),
  organizerName: z.string(),
  /** Hidden by the server until enough participants are included. */
  stats: participantStatsSchema.nullable(),
  /** Included participants needed before the server shows stats. */
  statsMinParticipants: z.number(),
})

export type EventDetail = z.infer<typeof eventDetailSchema>

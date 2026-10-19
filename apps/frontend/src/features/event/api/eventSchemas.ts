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

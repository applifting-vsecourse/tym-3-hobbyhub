import { z } from "zod"

// Mirrors the server-side DTO, so the form can tell the user before sending.
export const EVENT_LIMITS = {
  titleMin: 3,
  titleMax: 80,
  descriptionMax: 2000,
  equipmentMax: 500,
  contributionNoteMax: 200,
  contributionMaxAmount: 99_999_999.99,
  streetMax: 200,
  cityMax: 100,
  postalCodeMax: 20,
  countryMax: 100,
  placeNameMax: 200,
  participantsLimit: 500,
} as const

// MANUAL: the organizer decides every request to join. AUTOMATIC: a request
// takes a free seat at once.
export const APPROVAL_MODES = ["MANUAL", "AUTOMATIC"] as const
export type ApprovalMode = (typeof APPROVAL_MODES)[number]

// F-05.1 creates events at a place; ONLINE waits for a PO decision (ADR-0006).
export const CREATABLE_VENUE_TYPES = ["PUBLIC_VENUE", "PRIVATE_VENUE"] as const
export type CreatableVenueType = (typeof CREATABLE_VENUE_TYPES)[number]

export const eventLocationSchema = z.object({
  street: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  placeName: z.string().nullable(),
})

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  equipment: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "FINISHED", "NOT_HELD"]),
  visibility: z.enum(["PUBLIC", "GROUP_ONLY", "PRIVATE"]),
  venueType: z.enum(["PUBLIC_VENUE", "PRIVATE_VENUE", "ONLINE"]),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  minParticipants: z.number(),
  maxParticipants: z.number(),
  externalOccupiedSpots: z.number(),
  approvedCount: z.number(),
  occupiedSpots: z.number(),
  missingToMinimum: z.number(),
  freeSpots: z.number(),
  fillState: z.enum(["BELOW_MINIMUM", "MINIMUM_REACHED", "FULL"]),
  contributionAmount: z.number().nullable(),
  contributionNote: z.string().nullable(),
  location: eventLocationSchema.nullable(),
  activity: z.object({ id: z.string(), name: z.string(), icon: z.string() }),
  organizerId: z.string(),
})

export type Event = z.infer<typeof eventSchema>
export type EventLocation = z.infer<typeof eventLocationSchema>

export type CreateEventInput = {
  title: string
  activityId: string
  description: string
  equipment?: string
  venueType: CreatableVenueType
  approvalMode: ApprovalMode
  /** ISO date-time strings. */
  startAt: string
  endAt: string
  location: {
    street: string
    city: string
    postalCode: string
    country: string
    placeName?: string
  }
  minParticipants: number
  maxParticipants: number
  externalOccupiedSpots: number
  contributionAmount?: number
  contributionNote?: string
}

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
  // Public venues with a known position only; private venues are never located.
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  /** Straight-line km from the visitor; only when the list was asked for by position. */
  distanceKm: z.number().nullable(),
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
  /** Adds up to `total`: people without a known gender count as unknown. */
  gender: z.object({ male: z.number(), female: z.number(), unknown: z.number() }).nullable(),
})

export const eventDetailSchema = eventListItemSchema.extend({
  description: z.string(),
  equipment: z.string().nullable(),
  /** In CZK, information only. */
  contributionAmount: z.number().nullable(),
  contributionNote: z.string().nullable(),
  status: z.enum(["PUBLISHED", "CANCELLED", "FINISHED", "NOT_HELD"]),
  approvalMode: z.enum(APPROVAL_MODES),
  organizerName: z.string(),
  /** The public group that organizes the event, if any. */
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
  /** Hidden by the server until enough participants are included. */
  stats: participantStatsSchema.nullable(),
  /** Included participants needed before the server shows stats. */
  statsMinParticipants: z.number(),
})

export type EventDetail = z.infer<typeof eventDetailSchema>

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

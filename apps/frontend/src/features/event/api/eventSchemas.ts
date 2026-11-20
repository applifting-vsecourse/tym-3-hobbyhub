import { z } from "zod"

import { ratingScoreSchema } from "@/lib/ratingScore"

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
  chatUrlMax: 500,
  contactMax: 200,
  participantsLimit: 500,
} as const

// MANUAL: the organizer decides every request to join. AUTOMATIC: a request
// takes a free seat at once.
export const APPROVAL_MODES = ["MANUAL", "AUTOMATIC"] as const
export type ApprovalMode = (typeof APPROVAL_MODES)[number]

// #218, ADR-0029: a place or online. Whether the exact address of a place is
// public is `isAddressPublic`. A new event is always at a place: ONLINE waits
// for a PO decision (ADR-0006).
export const VENUE_TYPES = ["PLACE", "ONLINE"] as const

export const eventLocationSchema = z.object({
  street: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  placeName: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
})

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  equipment: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "FINISHED", "NOT_HELD"]),
  visibility: z.enum(["PUBLIC", "GROUP_ONLY", "PRIVATE"]),
  venueType: z.enum(VENUE_TYPES),
  /** #218: everyone who sees the event sees its exact address. */
  isAddressPublic: z.boolean(),
  approvalMode: z.enum(APPROVAL_MODES),
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
  externalChatUrl: z.string().nullable(),
  contact: z.string().nullable(),
  location: eventLocationSchema.nullable(),
  activity: z.object({ id: z.string(), name: z.string(), icon: z.string() }),
  organizerId: z.string(),
  cancellationReason: z.string().nullable(),
  cancellationNote: z.string().nullable(),
})

export const CANCELLATION_NOTE_MAX = 500

export const cancellationReasonSchema = z.object({ id: z.string(), name: z.string() })
export const cancellationReasonsSchema = z.array(cancellationReasonSchema)
export type CancellationReason = z.infer<typeof cancellationReasonSchema>

export type CancelEventInput = {
  cancellationReasonId: string
  cancellationNote?: string
}

export type Event = z.infer<typeof eventSchema>
export type EventLocation = z.infer<typeof eventLocationSchema>

export type CreateEventInput = {
  title: string
  activityId: string
  description: string
  equipment?: string
  /**
   * Sent with an edit only: an online event cannot be created yet, but one
   * that exists can be edited, and keeps its kind.
   */
  venueType: Event["venueType"]
  /** #218: everyone sees the exact address, or only the people with a seat. */
  isAddressPublic: boolean
  approvalMode: ApprovalMode
  /** ISO date-time strings. */
  startAt: string
  endAt: string
  /** Left out for an online event. */
  location?: {
    street: string
    city: string
    postalCode: string
    country: string
    placeName?: string
    /** Both or neither. */
    latitude?: number
    longitude?: number
  }
  minParticipants: number
  maxParticipants: number
  externalOccupiedSpots: number
  contributionAmount?: number
  contributionNote?: string
  /** Shown to approved participants only. */
  externalChatUrl?: string
  contact?: string
}

export const eventListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().nullable(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  venueType: z.enum(VENUE_TYPES),
  /** #218: whether the organizer made the exact address public. */
  isAddressPublic: z.boolean(),
  // Only approximate: the API sends no street here, and no name unless the
  // address is public.
  placeName: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  level: z.string().nullable(),
  // A public address with a known position only; a hidden one is never located.
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
  organizerName: z.string(),
  /** The public group that organizes the event, if any. */
  group: z.object({ id: z.string(), name: z.string() }).nullable(),
  /** Per seat in CZK, information only. */
  contributionAmount: z.number().nullable(),
})

export const eventListSchema = z.object({
  items: z.array(eventListItemSchema),
  /** All upcoming public events, not just this page. */
  total: z.number(),
  /** With a radius filter: events left out because they have no known position (#261). */
  withoutLocationCount: z.number().optional(),
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
  contributionNote: z.string().nullable(),
  status: z.enum(["PUBLISHED", "CANCELLED", "FINISHED", "NOT_HELD"]),
  approvalMode: z.enum(APPROVAL_MODES),
  /** Lets the page offer editing to the organizer. */
  organizerId: z.string(),
  /** GROUP_ONLY (F-07.2): only its group's members and those holding a seat see it. */
  visibility: z.enum(["PUBLIC", "GROUP_ONLY"]),
  cancellationReason: z.string().nullable(),
  cancellationNote: z.string().nullable(),
  /** Hidden by the server until enough participants are included. */
  stats: participantStatsSchema.nullable(),
  /** Included participants needed before the server shows stats. */
  statsMinParticipants: z.number(),
  /**
   * #239: why an administrator hid the event. Only its organizers ever get a
   * hidden event, so anyone else always sees null.
   */
  hiddenReason: z.string().nullable(),
  /** #236: the participants' revealed ratings; both null below three. */
  rating: ratingScoreSchema,
  /**
   * #218: the exact address, when the organizer made it public; null when
   * only the people with a seat get it, from the participant info.
   */
  location: eventLocationSchema.nullable(),
})

export type EventDetail = z.infer<typeof eventDetailSchema>

/** F-07.2: a card of a group's event; a cancelled one stays in the list. */
export const groupEventSchema = eventListItemSchema.extend({
  status: z.enum(["PUBLISHED", "CANCELLED", "FINISHED", "NOT_HELD"]),
  visibility: z.enum(["PUBLIC", "GROUP_ONLY"]),
})

export const groupEventPageSchema = z.object({
  items: z.array(groupEventSchema),
  /** All the events of the period, not just this page. */
  total: z.number(),
})

export type GroupEvent = z.infer<typeof groupEventSchema>

/** Not over yet, soonest first; or over, newest first. */
export const GROUP_EVENT_PERIODS = ["upcoming", "past"] as const
export type GroupEventPeriod = (typeof GROUP_EVENT_PERIODS)[number]

/**
 * What only the organizers and approved participants get (F-06.5): the exact
 * address and the ways to reach the organizer. Not part of the public detail.
 */
export const participantInfoSchema = z.object({
  venueType: z.enum(VENUE_TYPES),
  location: eventLocationSchema.nullable(),
  organizerName: z.string(),
  // Rendered as a link: only web addresses, whatever an old row may hold.
  externalChatUrl: z
    .string()
    .refine((url) => /^https?:\/\//i.test(url))
    .nullable(),
  contact: z.string().nullable(),
})

export type ParticipantInfo = z.infer<typeof participantInfoSchema>

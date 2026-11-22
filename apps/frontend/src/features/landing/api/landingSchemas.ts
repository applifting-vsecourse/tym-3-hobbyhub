import { z } from "zod"

// #215: the landing page's own view of `GET /landing`. Features do not share
// schemas, so this holds only what the landing cards show; the server sends
// the full list item and zod drops the rest.

/** The rows of the landing page, as `GET /landing` names them. */
export const LANDING_ROW_KINDS = [
  "lastMinute",
  "top",
  "liked",
  "friends",
  "near",
  "today",
  "weekend",
  "groupsForYou",
  "trendingGroups",
] as const

export type LandingRowKind = (typeof LANDING_ROW_KINDS)[number]

const activitySchema = z.object({ id: z.string(), name: z.string(), icon: z.string() })

export const landingFriendSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
})

export const landingEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().nullable(),
  startAt: z.coerce.date(),
  venueType: z.string(),
  // No name of a place whose address is not public (#218).
  placeName: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  // Key of the icon in `ACTIVITIES`; unknown keys are possible.
  activity: activitySchema,
  minParticipants: z.number(),
  maxParticipants: z.number(),
  takenCount: z.number(),
  organizerName: z.string(),
  /** The viewer holds a seat, or asked for one; null for a visitor or neither. */
  viewerState: z.enum(["JOINED", "PENDING"]).nullable(),
  /** Friends going who allow friends to see their upcoming events; nobody else. */
  friends: z.array(landingFriendSchema),
  /** The organizer's public score on "Top akce", for a signed-in viewer only. */
  organizerScore: z
    .object({ count: z.number().nullable(), average: z.number().nullable() })
    .nullable(),
})

export const landingGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  locationName: z.string().nullable(),
  usualSchedule: z.string().nullable(),
  activity: activitySchema,
  memberCount: z.number(),
  /** Members who joined in the last 30 days; "Trendy skupiny" only. */
  recentMemberCount: z.number().nullable(),
})

export const landingRowSchema = z.object({
  kind: z.enum(LANDING_ROW_KINDS),
  status: z.enum(["ok", "error"]),
  events: z.array(landingEventSchema),
  groups: z.array(landingGroupSchema),
})

export const landingSchema = z.object({
  /** In the order of the page; a row with nothing to show is not here. */
  rows: z.array(landingRowSchema),
  /** How "Ve tvém okolí" was picked: around the home, or in a city. */
  near: z
    .object({
      mode: z.enum(["radius", "city"]),
      radiusKm: z.number().nullable(),
      city: z.string(),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
    })
    .nullable(),
  /** The cities to pick from when "near" goes by city. */
  cities: z.array(z.object({ city: z.string(), eventCount: z.number() })),
  /** The viewer's own profile activities, for the link of their row. */
  interestActivityIds: z.array(z.string()),
})

/** The total of the event list, all the hero needs of it. */
export const eventTotalSchema = z.object({ total: z.number() })

export type LandingActivity = z.infer<typeof activitySchema>
export type LandingEvent = z.infer<typeof landingEventSchema>
export type LandingGroup = z.infer<typeof landingGroupSchema>
export type LandingRow = z.infer<typeof landingRowSchema>
export type Landing = z.infer<typeof landingSchema>

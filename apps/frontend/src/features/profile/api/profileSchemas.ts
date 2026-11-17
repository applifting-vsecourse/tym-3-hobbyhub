import { z } from "zod"

import { userRatingScoresSchema } from "@/lib/ratingScore"

const activitySchema = z.object({ id: z.string(), name: z.string(), icon: z.string() })

const interestSchema = z.object({
  activity: activitySchema,
  level: z.object({ id: z.string(), name: z.string() }).nullable(),
})

// The home address: all of it, with the position.
export const homeAddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  latitude: z.number(),
  longitude: z.number(),
})

export type HomeAddress = z.infer<typeof homeAddressSchema>

export type ActivityOption = z.infer<typeof activitySchema>

export type SaveInterestsInput = {
  items: { activityId: string; levelId: string | null }[]
}

export const GENDERS = ["MALE", "FEMALE"] as const

/** My own profile: the public parts and the private ones only I see. */
export const profileSchema = z.object({
  /** The public nickname, unique (#212). */
  name: z.string(),
  /** When the nickname may be changed again; null = now. Only I see it. */
  nicknameChangeableFrom: z.coerce.date().nullable(),
  /** When the account was created. */
  joinedAt: z.coerce.date(),
  bio: z.string().nullable(),
  /** A WebP data URL. */
  image: z.string().nullable(),
  /** The chosen cover id; null = the default of the first sport. */
  cover: z.string().nullable(),
  gender: z.enum(GENDERS).nullable(),
  /** Only the year, never the full date (#174). */
  birthYear: z.number().int().nullable(),
  interests: z.array(interestSchema),
  address: homeAddressSchema.nullable(),
  /** #227: friends see the past events. Only I see this switch. */
  friendsSeeEventHistory: z.boolean(),
  /** #227: friends see the upcoming events and my name in an event's detail. */
  friendsSeeUpcomingEvents: z.boolean(),
  /** #236: my scores as an organizer and as a participant, always whole. */
  ratings: userRatingScoresSchema,
})

export type Profile = z.infer<typeof profileSchema>

/**
 * Someone else's profile (F-04.2): no gender, birth year, address or e-mail.
 */
export const publicProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** #225: where I stand with the person; the same values as the friendship feature's. */
  relation: z.enum(["none", "request_sent", "request_received", "friends"]),
  bio: z.string().nullable(),
  image: z.string().nullable(),
  cover: z.string().nullable(),
  interests: z.array(interestSchema),
  /** #236: both numbers null below three ratings. */
  ratings: userRatingScoresSchema,
})

export type PublicProfile = z.infer<typeof publicProfileSchema>

export type UpdateProfileInput = {
  name?: string
  bio?: string | null
  image?: string | null
  cover?: string | null
}

/**
 * `PUT /profile/private`: the gender with the year of birth, (#227) the two
 * switches of what friends see, or both, saved in one write. Each pair is sent
 * whole or not at all; the server refuses half of one.
 */
export type UpdatePrivateDetailsInput = {
  gender?: (typeof GENDERS)[number]
  birthYear?: number
  friendsSeeEventHistory?: boolean
  friendsSeeUpcomingEvents?: boolean
}

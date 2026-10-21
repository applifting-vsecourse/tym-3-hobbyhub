import { z } from "zod"

import { SKILL_LEVELS } from "@/features/onboarding/lib/onboardingLimits"

// What the wizard needs of an activity; the activity feature owns the full one.
export const activityOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
})

export type ActivityOption = z.infer<typeof activityOptionSchema>

export const interestSchema = z.object({
  activity: activityOptionSchema,
  level: z.enum(SKILL_LEVELS).nullable(),
})

export const onboardingSchema = z.object({
  /** Steps done or skipped, 0 to 3. */
  stepsDone: z.number(),
  /** The wizard ended but there are no activities or no location yet. */
  skipped: z.boolean(),
  /** Set once the wizard ended, finished or skipped. */
  completedAt: z.coerce.date().nullable(),
  interests: z.array(interestSchema),
  city: z.string().nullable(),
  street: z.string().nullable(),
  travelRadiusKm: z.number().nullable(),
  bio: z.string().nullable(),
})

export type Onboarding = z.infer<typeof onboardingSchema>

export type SaveActivitiesInput = {
  items: { activityId: string; level: (typeof SKILL_LEVELS)[number] | null }[]
}
export type SaveLocationInput = { city: string; street?: string; travelRadiusKm: number }
export type SaveProfileInput = { bio?: string }

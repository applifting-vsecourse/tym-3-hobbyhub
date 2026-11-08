import { z } from "zod"

// Main category of an activity (ADR-0019): pickers group activities under it.
export const activityCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  // Key of the category in `CATEGORIES` (ActivityIcon.tsx); unknown keys are possible.
  icon: z.string(),
  /** Position of the category in pickers and filters. */
  order: z.number(),
})

export const activitySchema = z.object({
  id: z.string(),
  name: z.string(),
  // Key of the icon in `ACTIVITIES` (ActivityIcon.tsx); unknown keys are possible.
  icon: z.string(),
  /** Usual size of a game; the event form starts from these. */
  defaultMinParticipants: z.number(),
  defaultMaxParticipants: z.number(),
  category: activityCategorySchema,
})

export const activitiesSchema = z.array(activitySchema)

export type Activity = z.infer<typeof activitySchema>

export type ActivityCategory = z.infer<typeof activityCategorySchema>

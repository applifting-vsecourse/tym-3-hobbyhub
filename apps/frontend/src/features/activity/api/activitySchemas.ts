import { z } from "zod"

export const activitySchema = z.object({
  id: z.string(),
  name: z.string(),
  // Key of the icon in `ACTIVITIES` (ActivityIcon.tsx); unknown keys are possible.
  icon: z.string(),
  /** Usual size of a game; the event form starts from these. */
  defaultMinParticipants: z.number(),
  defaultMaxParticipants: z.number(),
})

export const activitiesSchema = z.array(activitySchema)

export type Activity = z.infer<typeof activitySchema>

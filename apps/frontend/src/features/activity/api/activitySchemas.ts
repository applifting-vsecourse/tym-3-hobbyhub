import { z } from "zod"

export const activitySchema = z.object({
  id: z.string(),
  name: z.string(),
  // Key of the icon in `ACTIVITIES` (ActivityIcon.tsx); unknown keys are possible.
  icon: z.string(),
})

export const activitiesSchema = z.array(activitySchema)

export type Activity = z.infer<typeof activitySchema>

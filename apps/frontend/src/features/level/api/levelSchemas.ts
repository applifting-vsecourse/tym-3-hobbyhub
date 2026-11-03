import { z } from "zod"

/** A level a person can name for an activity they play. */
export const levelSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const levelsSchema = z.array(levelSchema)

export type Level = z.infer<typeof levelSchema>

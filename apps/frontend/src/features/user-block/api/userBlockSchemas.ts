import { z } from "zod"

/** #65: someone the signed-in user blocked, for their settings. */
export const blockedUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  blockedAt: z.coerce.date(),
})

export type BlockedUser = z.infer<typeof blockedUserSchema>

export const blockedUsersSchema = z.array(blockedUserSchema)

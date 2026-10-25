import { z } from "zod"

// Mirrors the server-side DTO, so the form can tell the user before sending.
export const GROUP_LIMITS = {
  nameMin: 3,
  nameMax: 80,
  descriptionMax: 2000,
  locationMax: 100,
  scheduleMax: 100,
} as const

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  locationName: z.string().nullable(),
  usualSchedule: z.string().nullable(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  status: z.enum(["ACTIVE", "CANCELLED"]),
  createdAt: z.coerce.date(),
  activity: z.object({ id: z.string(), name: z.string(), icon: z.string() }),
  memberCount: z.number(),
})

export type Group = z.infer<typeof groupSchema>

export const groupMembershipSchema = z.object({
  isMember: z.boolean(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).nullable(),
})

export const myGroupSchema = groupSchema.extend({
  myRole: z.enum(["OWNER", "ADMIN", "MEMBER"]),
})

export type MyGroup = z.infer<typeof myGroupSchema>
export type GroupRole = MyGroup["myRole"]

export const nearbyGroupsSchema = z.object({
  // Null when the user has no city in their profile.
  city: z.string().nullable(),
  groups: z.array(groupSchema),
})

export const groupPageSchema = z.object({
  items: z.array(groupSchema),
  nextCursor: z.string().nullable(),
})

export type CreateGroupInput = {
  name: string
  activityId: string
  description: string
  locationName?: string
  usualSchedule?: string
}

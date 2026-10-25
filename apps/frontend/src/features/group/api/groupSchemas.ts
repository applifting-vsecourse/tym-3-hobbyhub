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

export const groupRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"])

export type GroupRole = z.infer<typeof groupRoleSchema>

/** Like the server's `hasGroupAdminRights`: the founder may do all an admin may. */
export const hasGroupAdminRights = (role: GroupRole | null | undefined): boolean =>
  role === "OWNER" || role === "ADMIN"

export const groupMembershipSchema = z.object({
  isMember: z.boolean(),
  role: groupRoleSchema.nullable(),
})

export const myGroupSchema = groupSchema.extend({
  myRole: groupRoleSchema,
})

export type MyGroup = z.infer<typeof myGroupSchema>

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

import { z } from "zod"

// #238: what `/api/admin/*` answers, read only. Mirrors the server's admin
// DTOs; a feature does not import another one, so nothing is shared with
// `event` or `group`.

/** Like the server's `ADMIN_PAGE_SIZE`. */
export const ADMIN_PAGE_SIZE = 20
/** Like the server's `ADMIN_SEARCH_MAX_LENGTH`. */
export const ADMIN_SEARCH_MAX_LENGTH = 100

const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number() })

const refSchema = z.object({ id: z.string(), name: z.string() })

export const userStatusSchema = z.enum(["ACTIVE", "RESTRICTED", "BLOCKED", "DELETED"])
export const eventStatusSchema = z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "FINISHED", "NOT_HELD"])
export const eventVisibilitySchema = z.enum(["PUBLIC", "GROUP_ONLY", "PRIVATE"])
export const participationStatusSchema = z.enum([
  "APPROVED",
  "WAITLISTED",
  "CANCELLED",
  "ATTENDED",
  "NO_SHOW",
  "INVITED",
  "DECLINED",
])
export const groupVisibilitySchema = z.enum(["PUBLIC", "PRIVATE"])
export const groupStatusSchema = z.enum(["ACTIVE", "CANCELLED"])
export const groupRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"])

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  status: userStatusSchema,
  createdAt: z.coerce.date(),
})
export type AdminUser = z.infer<typeof adminUserSchema>
export const adminUserPageSchema = pageOf(adminUserSchema)

export const adminUserDetailSchema = z.object({
  account: adminUserSchema,
  profile: z.object({
    bio: z.string().nullable(),
    gender: z.enum(["MALE", "FEMALE"]).nullable(),
    birthYear: z.number().nullable(),
    interests: z.array(
      z.object({
        activity: z.object({ id: z.string(), name: z.string() }),
        level: z.object({ name: z.string() }).nullable(),
      }),
    ),
    address: z
      .object({
        street: z.string(),
        city: z.string(),
        postalCode: z.string(),
        country: z.string(),
      })
      .nullable(),
  }),
})
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>

export const adminEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: eventStatusSchema,
  visibility: eventVisibilitySchema,
  isHidden: z.boolean(),
  startAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  activityName: z.string(),
  organizer: refSchema,
  group: refSchema.nullable(),
})
export type AdminEvent = z.infer<typeof adminEventSchema>
export const adminEventPageSchema = pageOf(adminEventSchema)

export const adminUserEventsSchema = z.object({
  organized: z.array(adminEventSchema),
  participations: z.array(
    adminEventSchema.extend({ participationStatus: participationStatusSchema }),
  ),
})
export type AdminUserEvents = z.infer<typeof adminUserEventsSchema>

export const adminEventDetailSchema = z.object({
  event: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: eventStatusSchema,
    visibility: eventVisibilitySchema,
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    minParticipants: z.number(),
    maxParticipants: z.number(),
    approvedCount: z.number(),
    contact: z.string().nullable(),
    externalChatUrl: z.string().nullable(),
    location: z
      .object({
        street: z.string(),
        city: z.string(),
        postalCode: z.string(),
        country: z.string(),
        placeName: z.string().nullable(),
      })
      .nullable(),
    activity: z.object({ name: z.string() }),
    cancellationReason: z.string().nullable(),
    cancellationNote: z.string().nullable(),
  }),
  isHidden: z.boolean(),
  /** #239: why, when and by whom; `hiddenBy` is null for events hidden before ADR-0022. */
  hiddenReason: z.string().nullable(),
  hiddenAt: z.coerce.date().nullable(),
  hiddenBy: refSchema.nullable(),
  organizer: refSchema.extend({ email: z.string() }),
  group: refSchema.nullable(),
  participants: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      status: participationStatusSchema,
      waitlistPosition: z.number().nullable(),
    }),
  ),
})
export type AdminEventDetail = z.infer<typeof adminEventDetailSchema>

export const adminGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  locationName: z.string().nullable(),
  usualSchedule: z.string().nullable(),
  visibility: groupVisibilitySchema,
  status: groupStatusSchema,
  createdAt: z.coerce.date(),
  activity: z.object({ name: z.string() }),
  memberCount: z.number(),
})
export type AdminGroup = z.infer<typeof adminGroupSchema>
export const adminGroupPageSchema = pageOf(adminGroupSchema)

export const adminGroupDetailSchema = z.object({
  group: adminGroupSchema,
  members: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      role: groupRoleSchema,
      joinedAt: z.coerce.date(),
    }),
  ),
})
export type AdminGroupDetail = z.infer<typeof adminGroupDetailSchema>

export const adminGroupRequestSchema = z.object({
  id: z.string(),
  message: z.string().nullable(),
  requestedAt: z.coerce.date(),
  applicant: z.object({ name: z.string(), hasVerifiedEmail: z.boolean() }),
})
export type AdminGroupRequest = z.infer<typeof adminGroupRequestSchema>

/** Like the server's `ADMINISTRATOR_NAME_MAX_LENGTH`. */
export const ADMINISTRATOR_NAME_MAX_LENGTH = 100
/** Like the server's `ADMIN_PASSWORD_MIN_LENGTH`. */
export const ADMIN_PASSWORD_MIN_LENGTH = 12

export const administratorStatusSchema = z.enum(["INVITED", "ACTIVE", "DEACTIVATED"])
export type AdministratorStatus = z.infer<typeof administratorStatusSchema>

export const administratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.coerce.date(),
  status: administratorStatusSchema,
  createdBy: refSchema.nullable(),
  deactivatedAt: z.coerce.date().nullable(),
  deactivatedBy: refSchema.nullable(),
})
export type Administrator = z.infer<typeof administratorSchema>

// #237, ADR-0021: why the server refused a change to an administrator.
export const administratorViolationSchema = z.enum([
  "ALREADY_ADMINISTRATOR",
  "DEACTIVATED_ADMINISTRATOR",
  "NOT_INVITED",
  "SELF",
  "ALREADY_DEACTIVATED",
  "LAST_ACTIVE",
  "NOT_DEACTIVATED",
])
export type AdministratorViolation = z.infer<typeof administratorViolationSchema>

// The body of a refusal (400, or 409 for an address taken).
export const administratorRefusalSchema = z.object({
  violations: z.array(administratorViolationSchema),
})

// #239: the limits of HideEventDto; the server checks them again.
export const EVENT_HIDDEN_REASON_MIN_LENGTH = 10
export const EVENT_HIDDEN_REASON_MAX_LENGTH = 500

export const eventModerationViolationSchema = z.enum([
  "EVENT_IS_DRAFT",
  "EVENT_ALREADY_HIDDEN",
  "EVENT_NOT_HIDDEN",
])
export type EventModerationViolation = z.infer<typeof eventModerationViolationSchema>

export const eventModerationRefusalSchema = z.object({
  violations: z.array(eventModerationViolationSchema),
})

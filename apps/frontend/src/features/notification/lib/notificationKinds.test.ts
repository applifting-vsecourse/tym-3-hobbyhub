import { describe, expect, it } from "vitest"

import {
  NOTIFICATION_KINDS,
  notificationTypeSchema,
} from "@/features/notification/api/notificationSchemas"
import {
  NOTIFICATION_TYPES_BY_KIND,
  notificationKindOf,
} from "@/features/notification/lib/notificationKinds"

describe("notificationKindOf", () => {
  it.each([
    ["NEW_REQUESTS", "requests"],
    ["REQUEST_DECIDED", "requests"],
    ["PARTICIPANT_CANCELLED", "requests"],
    ["CONFIRMATION_PROMPT", "requests"],
    ["SPOT_AVAILABLE", "requests"],
    ["EVENT_CHANGED", "events"],
    ["EVENT_CANCELLED", "events"],
    ["EVENT_BOARD", "events"],
    ["GROUP_INVITATION", "groups"],
    ["ONBOARDING_SERIES", "other"],
    ["MONTHLY_RECOMMENDATION", "other"],
  ] as const)("files %s under %s", (type, kind) => {
    expect(notificationKindOf(type)).toBe(kind)
  })

  it("puts every type in exactly one kind", () => {
    const types = NOTIFICATION_KINDS.flatMap((kind) => NOTIFICATION_TYPES_BY_KIND[kind])
    expect([...types].sort()).toEqual([...notificationTypeSchema.options].sort())
  })
})

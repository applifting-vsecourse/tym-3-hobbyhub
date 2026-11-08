import { describe, expect, it } from "vitest"

import { notificationsSearchSchema } from "@/features/notification/lib/notificationsSearch"

describe("notificationsSearchSchema", () => {
  it("reads a known kind", () => {
    expect(notificationsSearchSchema.parse({ kind: "events" })).toEqual({ kind: "events" })
  })

  it.each([["messages"], ["EVENT_CHANGED"], [42], [["events"]]])(
    "shows everything for kind=%j",
    (kind) => {
      expect(notificationsSearchSchema.parse({ kind })).toEqual({ kind: undefined })
    },
  )

  it("shows everything without a kind", () => {
    expect(notificationsSearchSchema.parse({})).toEqual({})
  })
})

import { describe, expect, it } from "vitest"

import { redirectTarget } from "@/features/auth/lib/redirect"

describe("redirectTarget", () => {
  it("returns to the page the user came from", () => {
    expect(redirectTarget(encodeURIComponent("/events/42?tab=roster"), "/")).toBe(
      "/events/42?tab=roster",
    )
  })

  it("falls back without a source page", () => {
    expect(redirectTarget(undefined, "/")).toBe("/")
  })

  it.each(["https://evil.example", "//evil.example", "javascript:alert(1)"])(
    "never leaves the app for %s",
    (from) => {
      expect(redirectTarget(encodeURIComponent(from), "/")).toBe("/")
    },
  )
})

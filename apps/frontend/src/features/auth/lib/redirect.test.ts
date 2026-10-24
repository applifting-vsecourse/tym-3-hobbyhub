import { describe, expect, it } from "vitest"

import { redirectTarget, redirectTargetOutside } from "@/features/auth/lib/redirect"

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

describe("redirectTargetOutside", () => {
  const outside = (from: string | undefined) =>
    redirectTargetOutside(from, "/events", "/onboarding")

  it("keeps an ordinary page", () => {
    expect(outside(encodeURIComponent("/events/42"))).toBe("/events/42")
  })

  it("falls back without a source page or when the source is the excluded page", () => {
    expect(outside(undefined)).toBe("/events")
    expect(outside(encodeURIComponent("/onboarding"))).toBe("/events")
  })

  it("follows the page nested in the excluded page's own from", () => {
    const wrapped = `/onboarding?from=${encodeURIComponent("/events/42?tab=roster")}`
    expect(outside(encodeURIComponent(wrapped))).toBe("/events/42?tab=roster")
  })

  it("follows several levels of nesting, but gives up on an endless chain", () => {
    const once = `/onboarding?from=${encodeURIComponent("/events/42")}`
    const twice = `/onboarding?from=${encodeURIComponent(once)}`
    expect(outside(encodeURIComponent(twice))).toBe("/events/42")

    let loop = "/onboarding"
    for (let i = 0; i < 6; i++) loop = `/onboarding?from=${encodeURIComponent(loop)}`
    expect(outside(encodeURIComponent(loop))).toBe("/events")
  })

  it("never leaves the app through the nested page either", () => {
    const wrapped = `/onboarding?from=${encodeURIComponent("https://evil.example")}`
    expect(outside(encodeURIComponent(wrapped))).toBe("/events")
  })

  it("does not mistake a page that only starts with the same letters", () => {
    expect(outside(encodeURIComponent("/onboarding-tips"))).toBe("/onboarding-tips")
  })
})

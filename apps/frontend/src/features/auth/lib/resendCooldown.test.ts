import { describe, expect, it } from "vitest"

import { resendSecondsLeft, startResendCooldown } from "@/features/auth/lib/resendCooldown"

describe("resend cooldown", () => {
  it("counts down from a minute per address, whatever its case", () => {
    startResendCooldown("Jana@Example.com", 1_000_000)

    expect(resendSecondsLeft("jana@example.com", 1_000_000)).toBe(60)
    expect(resendSecondsLeft("jana@example.com", 1_020_500)).toBe(40)
    expect(resendSecondsLeft("jana@example.com", 1_060_000)).toBe(0)
  })

  it("does not hold back an address that was not sent to", () => {
    expect(resendSecondsLeft("nikdo@example.com", 1_000_000)).toBe(0)
  })
})

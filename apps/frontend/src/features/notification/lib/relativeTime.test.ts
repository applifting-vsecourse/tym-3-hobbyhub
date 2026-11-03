import { describe, expect, it } from "vitest"

import { relativeTime } from "@/features/notification/lib/relativeTime"

const now = new Date("2030-01-10T12:00:00Z")
const ago = (ms: number) => new Date(now.getTime() - ms)
const at = (date: Date) => relativeTime(date, now, "cs", "právě teď")

describe("relativeTime", () => {
  it("says 'just now' under a minute", () => {
    expect(at(ago(30_000))).toBe("právě teď")
  })

  it("counts minutes, hours and days", () => {
    expect(at(ago(5 * 60_000))).toBe("před 5 min")
    expect(at(ago(3 * 3_600_000))).toBe("před 3 h")
    expect(at(ago(24 * 3_600_000))).toBe("včera")
    expect(at(ago(3 * 24 * 3_600_000))).toBe("před 3 dny")
  })

  it("shows the date after a week", () => {
    expect(at(ago(8 * 24 * 3_600_000))).toMatch(/2\. 1\. 2030/)
  })

  it("follows the locale", () => {
    // The exact abbreviation depends on the ICU data of the runtime.
    expect(relativeTime(ago(5 * 60_000), now, "en", "just now")).toMatch(/^5 ?m(in\.)? ago$/)
  })
})

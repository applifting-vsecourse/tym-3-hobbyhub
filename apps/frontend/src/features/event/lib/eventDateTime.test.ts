import { describe, expect, it } from "vitest"

import {
  combineDateTime,
  formatContribution,
  formatEventRange,
} from "@/features/event/lib/eventDateTime"

describe("combineDateTime", () => {
  it("builds a local date from the native inputs", () => {
    const value = combineDateTime("2026-10-15", "19:00")
    expect(value?.getFullYear()).toBe(2026)
    expect(value?.getMonth()).toBe(9)
    expect(value?.getDate()).toBe(15)
    expect(value?.getHours()).toBe(19)
    expect(value?.getMinutes()).toBe(0)
  })

  it.each([
    ["", "19:00"],
    ["2026-10-15", ""],
    ["15. 10. 2026", "19:00"],
    ["2026-13-45", "19:00"],
  ])("is null for %j %j", (date, time) => {
    expect(combineDateTime(date, time)).toBeNull()
  })
})

describe("formatEventRange", () => {
  it("repeats the date only when the event ends on another day", () => {
    const start = new Date(2026, 9, 15, 19, 0)
    expect(formatEventRange(start, new Date(2026, 9, 15, 20, 30), "cs")).toBe(
      "čtvrtek 15. 10. 2026, 19:00–20:30",
    )
    expect(formatEventRange(start, new Date(2026, 9, 16, 1, 0), "cs")).toBe(
      "čtvrtek 15. 10. 2026, 19:00–pátek 16. 10. 2026, 01:00",
    )
  })
})

describe("formatContribution", () => {
  // Intl separates the amount and the currency with a non-breaking space.
  const plain = (value: string) => value.replace(/\u00a0/g, " ")

  it("shows Czech crowns without needless decimals", () => {
    expect(plain(formatContribution(80, "cs"))).toBe("80 Kč")
    expect(plain(formatContribution(80.5, "cs"))).toBe("80,5 Kč")
  })
})

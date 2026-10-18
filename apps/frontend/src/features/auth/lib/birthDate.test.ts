import { describe, expect, it } from "vitest"

import { fromIsoDate, isAdult, moveToMonth, toIsoDate } from "@/features/auth/lib/birthDate"

describe("birth date", () => {
  it("keeps the picked calendar day whatever the time zone", () => {
    expect(toIsoDate(new Date(1995, 3, 12))).toBe("1995-04-12")
    expect(fromIsoDate("1995-04-12")).toEqual(new Date(1995, 3, 12))
  })

  it("rejects dates that do not exist", () => {
    expect(fromIsoDate("2001-02-30")).toBeUndefined()
    expect(fromIsoDate("12.4.1995")).toBeUndefined()
  })

  it("keeps the day when only the month or year changes", () => {
    const today = new Date(2026, 9, 16)
    expect(moveToMonth(new Date(1995, 3, 12), new Date(1990, 3), today)).toEqual(
      new Date(1990, 3, 12),
    )
    expect(moveToMonth(new Date(1996, 0, 31), new Date(1997, 1), today)).toEqual(
      new Date(1997, 1, 28),
    )
    expect(moveToMonth(new Date(1995, 9, 30), new Date(2026, 9), today)).toEqual(today)
  })

  it("counts someone as adult from their 18th birthday", () => {
    const today = new Date(2026, 9, 16, 12)
    expect(isAdult("2008-10-16", today)).toBe(true)
    expect(isAdult("2008-10-17", today)).toBe(false)
  })
})

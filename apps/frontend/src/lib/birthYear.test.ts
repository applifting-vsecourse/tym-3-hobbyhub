import { describe, expect, it } from "vitest"

import { birthYearProblem } from "@/lib/birthYear"

const TODAY = new Date(2026, 10, 6)

describe("birthYearProblem", () => {
  it("accepts a year of an adult", () => {
    expect(birthYearProblem("1995", TODAY)).toBeNull()
    expect(birthYearProblem(" 1995 ", TODAY)).toBeNull()
  })

  it("accepts the year in which someone turns 18, and refuses the one after", () => {
    expect(birthYearProblem("2008", TODAY)).toBeNull()
    expect(birthYearProblem("2009", TODAY)).toBe("underage")
  })

  it("asks for a year when there is none", () => {
    expect(birthYearProblem("", TODAY)).toBe("required")
    expect(birthYearProblem("  ", TODAY)).toBe("required")
  })

  it.each(["1899", "2027", "95", "1995-04-12", "12.4.1995", "19x5"])("refuses %s", (value) => {
    expect(birthYearProblem(value, TODAY)).toBe("invalid")
  })

  it("accepts 1900 as the oldest year", () => {
    expect(birthYearProblem("1900", TODAY)).toBeNull()
  })
})

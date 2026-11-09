import { describe, expect, it } from "vitest"

import {
  EVENT_SEARCH_MAX_LENGTH,
  eventsSearchSchema,
  filtersFromSearch,
  hasFilters,
  nonEmpty,
  searchWithFilters,
} from "@/features/event/lib/eventsSearch"

describe("eventsSearchSchema", () => {
  it("keeps what the app writes", () => {
    expect(
      eventsSearchSchema.parse({ activity: ["a1", "a2"], q: "tenis", location: "Brno" }),
    ).toEqual({
      activity: ["a1", "a2"],
      q: "tenis",
      location: "Brno",
    })
  })

  it("takes a single activity as a list of one", () => {
    expect(eventsSearchSchema.parse({ activity: "abc" }).activity).toEqual(["abc"])
  })

  it("takes a number the router parsed as the text it was", () => {
    expect(eventsSearchSchema.parse({ q: 2024 }).q).toBe("2024")
  })

  it("cuts a text the server would refuse", () => {
    const parsed = eventsSearchSchema.parse({ q: "x".repeat(EVENT_SEARCH_MAX_LENGTH + 50) })
    expect(parsed.q).toHaveLength(EVENT_SEARCH_MAX_LENGTH)
  })

  it("keeps a date range and drops what is no day", () => {
    expect(eventsSearchSchema.parse({ from: "2026-11-15", to: "2026-11-30" })).toEqual({
      from: "2026-11-15",
      to: "2026-11-30",
    })
    expect(eventsSearchSchema.parse({ from: "15.11.2026", to: 5 })).toEqual({})
    expect(eventsSearchSchema.parse({ from: "9999-99-99", to: "2026-02-30" })).toEqual({})
  })

  it("has no filter when nothing is in the address", () => {
    expect(eventsSearchSchema.parse({})).toEqual({})
  })
})

describe("nonEmpty", () => {
  it("drops blank texts and trims the others", () => {
    expect(nonEmpty("  ")).toBeUndefined()
    expect(nonEmpty(undefined)).toBeUndefined()
    expect(nonEmpty(" Brno ")).toBe("Brno")
  })
})

describe("filtersFromSearch", () => {
  it("reads every filter of the address, empty where there is none", () => {
    expect(
      filtersFromSearch({ activity: ["a1"], q: "tenis", location: "Brno", from: "2026-11-01" }),
    ).toEqual({
      filters: {
        activityIds: ["a1"],
        search: "tenis",
        location: "Brno",
        dateFrom: "2026-11-01",
        dateTo: "",
      },
      isRangeReversed: false,
    })
    expect(filtersFromSearch({}).filters).toEqual({
      activityIds: [],
      search: "",
      location: "",
      dateFrom: "",
      dateTo: "",
    })
  })

  it("does not ask for a range that ends before it starts, and says so", () => {
    const { filters, isRangeReversed } = filtersFromSearch({
      from: "2026-11-30",
      to: "2026-11-01",
    })
    expect(isRangeReversed).toBe(true)
    expect([filters.dateFrom, filters.dateTo]).toEqual(["", ""])
  })
})

describe("searchWithFilters", () => {
  it("changes only the filters given and keeps the rest of the address", () => {
    expect(
      searchWithFilters(
        { tab: "hosted", q: "tenis", location: "Brno" },
        { activityIds: ["a1"], dateFrom: "2026-11-01" },
      ),
    ).toEqual({
      tab: "hosted",
      q: "tenis",
      location: "Brno",
      activity: ["a1"],
      from: "2026-11-01",
    })
  })

  it("drops a filter that was emptied", () => {
    expect(
      searchWithFilters(
        { activity: ["a1"], location: "Brno", from: "2026-11-01", to: "2026-11-30" },
        { activityIds: [], location: " ", dateFrom: "", dateTo: "" },
      ),
    ).toEqual({ activity: undefined, location: undefined, from: undefined, to: undefined })
  })
})

describe("hasFilters", () => {
  it("is false only when nothing narrows the list", () => {
    const none = filtersFromSearch({}).filters
    expect(hasFilters(none)).toBe(false)
    expect(hasFilters({ ...none, search: "x" })).toBe(true)
    expect(hasFilters({ ...none, activityIds: ["a1"] })).toBe(true)
    expect(hasFilters({ ...none, dateTo: "2026-11-30" })).toBe(true)
  })
})

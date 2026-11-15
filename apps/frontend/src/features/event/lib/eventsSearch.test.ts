import { describe, expect, it } from "vitest"

import {
  EVENT_SEARCH_MAX_LENGTH,
  eventsListSearchSchema,
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
        freeSpotsOnly: false,
        priceFrom: "",
        priceTo: "",
        hoursFrom: "",
        hoursTo: "",
        capacityFrom: "",
        capacityTo: "",
      },
      isRangeReversed: false,
    })
    expect(filtersFromSearch({}).filters).toEqual({
      activityIds: [],
      search: "",
      location: "",
      dateFrom: "",
      dateTo: "",
      freeSpotsOnly: false,
      priceFrom: "",
      priceTo: "",
      hoursFrom: "",
      hoursTo: "",
      capacityFrom: "",
      capacityTo: "",
    })
  })

  it("reads the number ranges and the free-spot switch (#214)", () => {
    const { filters } = filtersFromSearch({
      free: true,
      priceFrom: 0,
      priceTo: 200,
      hoursFrom: 1,
      capacityTo: 12,
    })
    expect(filters).toMatchObject({
      freeSpotsOnly: true,
      priceFrom: "0",
      priceTo: "200",
      hoursFrom: "1",
      hoursTo: "",
      capacityFrom: "",
      capacityTo: "12",
    })
  })

  it("does not ask for a number range that is reversed, and says so", () => {
    const { filters, isRangeReversed } = filtersFromSearch({ priceFrom: 300, priceTo: 100 })
    expect(isRangeReversed).toBe(true)
    expect([filters.priceFrom, filters.priceTo]).toEqual(["", ""])
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

  it("writes the ranges and the switch, and drops them when emptied (#214)", () => {
    expect(
      searchWithFilters({}, { freeSpotsOnly: true, priceFrom: "0", priceTo: "200", hoursTo: "3" }),
    ).toEqual({ free: true, priceFrom: 0, priceTo: 200, hoursTo: 3 })
    expect(
      searchWithFilters(
        { free: true, priceFrom: 0, capacityTo: 9 },
        { freeSpotsOnly: false, priceFrom: "", capacityTo: "" },
      ),
    ).toEqual({ free: undefined, priceFrom: undefined, capacityTo: undefined })
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

describe("eventsListSearchSchema", () => {
  it("takes the ranges as numbers or text and drops what is not a number", () => {
    expect(
      eventsListSearchSchema.parse({
        priceFrom: 100,
        priceTo: "abc",
        free: "true",
        capacityTo: "12",
      }),
    ).toMatchObject({ priceFrom: 100, priceTo: undefined, free: true, capacityTo: 12 })
  })

  it("drops what the server would refuse (#214)", () => {
    expect(
      eventsListSearchSchema.parse({
        capacityFrom: 2.5,
        capacityTo: "1000",
        hoursTo: 745,
        priceTo: -5,
        hoursFrom: "744",
      }),
    ).toMatchObject({
      capacityFrom: undefined,
      capacityTo: undefined,
      hoursTo: undefined,
      priceTo: undefined,
      hoursFrom: 744,
    })
  })

  it("is not offered to the pages that do not apply the ranges", () => {
    expect(eventsSearchSchema.parse({ priceFrom: "100" })).not.toHaveProperty("priceFrom")
  })
})

describe("hasFilters", () => {
  it("is false only when nothing narrows the list", () => {
    const none = filtersFromSearch({}).filters
    expect(hasFilters(none)).toBe(false)
    expect(hasFilters({ ...none, search: "x" })).toBe(true)
    expect(hasFilters({ ...none, activityIds: ["a1"] })).toBe(true)
    expect(hasFilters({ ...none, dateTo: "2026-11-30" })).toBe(true)
    expect(hasFilters({ ...none, freeSpotsOnly: true })).toBe(true)
    expect(hasFilters({ ...none, capacityFrom: "4" })).toBe(true)
  })
})

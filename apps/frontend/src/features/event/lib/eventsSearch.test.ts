import { describe, expect, it } from "vitest"

import {
  EVENT_SEARCH_MAX_LENGTH,
  eventsSearchSchema,
  nonEmpty,
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

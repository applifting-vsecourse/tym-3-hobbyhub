import { describe, expect, it } from "vitest"

import { toSuggestion } from "@/lib/addressSuggestions"

const feature = (context: Record<string, unknown> = {}) =>
  ({
    properties: {
      name: "Chabařovická 4",
      full_address: "Chabařovická 4, 182 00 Praha, Česko",
      place_formatted: "182 00 Praha, Česko",
      context: {
        address: { name: "Chabařovická 4" },
        postcode: { name: "182 00" },
        place: { name: "Praha" },
        country: { name: "Česko" },
        ...context,
      },
      coordinates: { latitude: 50.1297, longitude: 14.4421 },
    },
  }) as Parameters<typeof toSuggestion>[0]

describe("toSuggestion", () => {
  it("splits an address into the fields of the forms and keeps the position", () => {
    expect(toSuggestion(feature())).toEqual({
      label: "Chabařovická 4, 182 00 Praha, Česko",
      street: "Chabařovická 4",
      city: "Praha",
      postalCode: "182 00",
      country: "Česko",
      latitude: 50.1297,
      longitude: 14.4421,
    })
  })

  it("falls back to the locality for a village with no place of its own", () => {
    const suggestion = toSuggestion(feature({ place: undefined, locality: { name: "Řepy" } }))
    expect(suggestion.city).toBe("Řepy")
  })

  it("leaves out what the geocoder did not know instead of inventing it", () => {
    const suggestion = toSuggestion(feature({ postcode: undefined, place: undefined }))
    expect(suggestion.postalCode).toBe("")
    expect(suggestion.city).toBe("")
  })

  it("builds the line from the name when there is no full address", () => {
    const base = feature()
    const suggestion = toSuggestion({
      properties: { ...base.properties, full_address: undefined },
    })
    expect(suggestion.label).toBe("Chabařovická 4, 182 00 Praha, Česko")
  })
})

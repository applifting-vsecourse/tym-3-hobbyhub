import { describe, expect, it } from "vitest"

import { filterSearchParams, NO_FILTERS } from "@/features/event/api/eventsQueryOptions"

// #261: the radius filter is asked of the server by these three parameters.
describe("filterSearchParams", () => {
  it("sends the place and its radius", () => {
    const params = filterSearchParams(
      { ...NO_FILTERS, around: { latitude: 50.1, longitude: 14.45, radiusKm: 25 } },
      20,
      0,
    )
    expect(params.get("aroundLat")).toBe("50.1")
    expect(params.get("aroundLng")).toBe("14.45")
    expect(params.get("radiusKm")).toBe("25")
  })

  it("sends nothing about a radius without a place", () => {
    const params = filterSearchParams(NO_FILTERS, 20, 0)
    expect(params.has("aroundLat")).toBe(false)
    expect(params.has("radiusKm")).toBe(false)
  })
})

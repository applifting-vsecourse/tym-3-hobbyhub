import { afterEach, describe, expect, it, vi } from "vitest"

import {
  addressSuggestionsQueryOptions,
  geocodeAddress,
  toSuggestion,
} from "@/lib/addressSuggestions"

const feature = (context: Record<string, unknown> = {}, featureType = "address") =>
  ({
    properties: {
      feature_type: featureType,
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
      isStreet: false,
      address: {
        label: "Chabařovická 4, 182 00 Praha, Česko",
        street: "Chabařovická 4",
        city: "Praha",
        postalCode: "182 00",
        country: "Česko",
        latitude: 50.1297,
        longitude: 14.4421,
      },
    })
  })

  it("falls back to the locality for a village with no place of its own", () => {
    const suggestion = toSuggestion(feature({ place: undefined, locality: { name: "Řepy" } }))
    expect(suggestion.address.city).toBe("Řepy")
  })

  it("leaves out what the geocoder did not know instead of inventing it", () => {
    const suggestion = toSuggestion(feature({ postcode: undefined, place: undefined }))
    expect(suggestion.address.postalCode).toBe("")
    expect(suggestion.address.city).toBe("")
  })

  it("builds the line from the name when there is no full address", () => {
    const base = feature()
    const suggestion = toSuggestion({
      properties: { ...base.properties, full_address: undefined },
    })
    expect(suggestion.address.label).toBe("Chabařovická 4, 182 00 Praha, Česko")
  })

  it("marks a whole street, which has no house number", () => {
    expect(toSuggestion(feature({}, "street")).isStreet).toBe(true)
  })
})

describe("addressSuggestionsQueryOptions", () => {
  const ask = async (language: string) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ features: [] }))
    vi.stubGlobal("fetch", fetchMock)
    const options = addressSuggestionsQueryOptions("Vodičkova", language)
    await (options.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>)({
      signal: new AbortController().signal,
    })
    return new URL(fetchMock.mock.calls[0]?.[0] as string).searchParams
  }

  afterEach(() => vi.unstubAllGlobals())

  it("also asks for streets, since an address only appears once a house number is typed", async () => {
    expect((await ask("cs")).get("types")).toBe("address,street")
  })

  it("keeps asking for streets whose name has a number in it", async () => {
    const ask = async (query: string, isStreetWanted?: boolean) => {
      const fetchMock = vi.fn().mockResolvedValue(Response.json({ features: [] }))
      vi.stubGlobal("fetch", fetchMock)
      await (
        addressSuggestionsQueryOptions(query, "cs", isStreetWanted).queryFn as (context: {
          signal: AbortSignal
        }) => Promise<unknown>
      )({ signal: new AbortController().signal })
      return new URL(fetchMock.mock.calls[0]?.[0] as string).searchParams.get("types")
    }

    expect(await ask("28. října")).toBe("address,street")
    expect(await ask("17. listopadu 5")).toBe("address")
    expect(await ask("Vodičkova 1/3 Praha")).toBe("address")
    expect(await ask("Vodičkova", false)).toBe("address")
  })

  it("asks for nearby places first, as the same street name is in many towns", async () => {
    expect((await ask("cs")).get("proximity")).toBe("ip")
  })

  it("keeps the cached suggestions of a regional and a bare language together", () => {
    expect(addressSuggestionsQueryOptions("Vodičkova", "cs-CZ").queryKey).toEqual(
      addressSuggestionsQueryOptions("Vodičkova", "cs").queryKey,
    )
  })

  it("sends the bare language, not a regional one the geocoder does not take", async () => {
    expect((await ask("cs-CZ")).get("language")).toBe("cs")
  })
})

describe("geocodeAddress", () => {
  const found = (city: string, postalCode: string) =>
    Response.json({
      features: [
        {
          properties: {
            feature_type: "address",
            name: "Chabařovická 4",
            context: { postcode: { name: postalCode }, place: { name: city } },
            coordinates: { latitude: 50.13, longitude: 14.44 },
          },
        },
      ],
    })
  const typed = { street: "Chabařovická 4", city: "Praha 8", postalCode: "182 00" }

  afterEach(() => vi.unstubAllGlobals())

  it("finds the position of an address typed by hand", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(found("Praha", "182 00")))
    expect(await geocodeAddress(typed, "cs")).toEqual({ latitude: 50.13, longitude: 14.44 })
  })

  it("takes the same postal code for the same place, whatever the city is called", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(found("Libeň", "182 00")))
    expect(await geocodeAddress(typed, "cs")).not.toBeNull()
  })

  it("gives nothing when the answer is another town", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(found("Brno", "602 00")))
    expect(await geocodeAddress(typed, "cs")).toBeNull()
  })

  it("does not ask for a street without a house number", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    expect(await geocodeAddress({ ...typed, street: "Chabařovická" }, "cs")).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("gives nothing when the geocoder fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    expect(await geocodeAddress(typed, "cs")).toBeNull()
  })
})

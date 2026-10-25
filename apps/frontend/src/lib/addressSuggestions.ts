import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { env } from "@/config/env"

const GEOCODING_URL = "https://api.mapbox.com/search/geocode/v6/forward"
const MAX_SUGGESTIONS = 5
// The app is for Czechia and Slovakia for now.
const COUNTRIES = "cz,sk"

/** Texts shorter than this are too vague to suggest anything from. */
export const MIN_ADDRESS_QUERY_LENGTH = 3

const nameOf = z.object({ name: z.string() }).optional()

// What Mapbox's geocoder (v6) returns for an address; only what is used here.
const responseSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({
        name: z.string(),
        full_address: z.string().optional(),
        place_formatted: z.string().optional(),
        context: z
          .object({
            address: nameOf,
            street: nameOf,
            postcode: nameOf,
            place: nameOf,
            locality: nameOf,
            district: nameOf,
            country: nameOf,
          })
          .partial()
          .default({}),
        coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
      }),
    }),
  ),
})

type Feature = z.infer<typeof responseSchema>["features"][number]

/** An address picked from the suggestions, in the shape the forms store. */
export type AddressSuggestion = {
  /** One line for the list: "Chabařovická 4, 182 00 Praha 8, Česko". */
  label: string
  street: string
  city: string
  postalCode: string
  country: string
  latitude: number
  longitude: number
}

export function toSuggestion({ properties }: Feature): AddressSuggestion {
  const { context } = properties
  const street = context.address?.name ?? context.street?.name ?? properties.name
  return {
    label: properties.full_address ?? [properties.name, properties.place_formatted].join(", "),
    street,
    city: context.place?.name ?? context.locality?.name ?? "",
    postalCode: context.postcode?.name ?? "",
    country: context.country?.name ?? "",
    latitude: properties.coordinates.latitude,
    longitude: properties.coordinates.longitude,
  }
}

/** Without a token the suggestions are off, and addresses are typed by hand. */
export const hasAddressSuggestions = () => env.VITE_MAPBOX_TOKEN !== undefined

export const addressSuggestionsQueryOptions = (query: string, language: string) =>
  queryOptions({
    queryKey: ["geo", "address-suggestions", language, query] as const,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        q: query,
        types: "address",
        autocomplete: "true",
        country: COUNTRIES,
        language,
        limit: String(MAX_SUGGESTIONS),
        access_token: env.VITE_MAPBOX_TOKEN ?? "",
      })
      const response = await fetch(`${GEOCODING_URL}?${params}`, { signal })
      if (!response.ok) throw new Error(`Address suggestions failed: ${response.status}`)
      return responseSchema.parse(await response.json()).features.map(toSuggestion)
    },
    enabled: hasAddressSuggestions() && query.trim().length >= MIN_ADDRESS_QUERY_LENGTH,
    // The same text gives the same suggestions for a while; typing back and forth is free.
    staleTime: 5 * 60 * 1000,
  })

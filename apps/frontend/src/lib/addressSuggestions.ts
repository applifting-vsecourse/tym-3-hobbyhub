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
        feature_type: z.string().optional(),
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

/** A suggestion as the geocoder returns it; `isStreet` marks a whole street, without a house number. */
export type AddressSuggestionItem = { address: AddressSuggestion; isStreet: boolean }

export function toSuggestion({ properties }: Feature): AddressSuggestionItem {
  const { context } = properties
  const street = context.address?.name ?? context.street?.name ?? properties.name
  return {
    isStreet: properties.feature_type === "street",
    address: {
      label: properties.full_address ?? [properties.name, properties.place_formatted].join(", "),
      street,
      city: context.place?.name ?? context.locality?.name ?? "",
      postalCode: context.postcode?.name ?? "",
      country: context.country?.name ?? "",
      latitude: properties.coordinates.latitude,
      longitude: properties.coordinates.longitude,
    },
  }
}

/** Without a token the suggestions are off, and addresses are typed by hand. */
export const hasAddressSuggestions = () => env.VITE_MAPBOX_TOKEN !== undefined

// A house number is a number on its own ("3", "12a", "1/3"), not one inside a
// street's name ("28. října", "17. listopadu").
const HAS_HOUSE_NUMBER = /(^|\s)\d+[a-z]?(\/\d+[a-z]?)?(?![\d.])(\s|$)/i

/**
 * The geocoder suggests an exact address only once a house number is typed, so
 * until then streets are asked for too (when the caller can use them); with a
 * number only exact addresses, so streets do not take their places.
 */
const typesFor = (query: string, isStreetWanted: boolean) =>
  isStreetWanted && !HAS_HOUSE_NUMBER.test(query) ? "address,street" : "address"

// The geocoder takes "cs", not a regional "cs-CZ".
const bareLanguageOf = (language: string) => language.split("-")[0] ?? language

const askGeocoder = async (
  query: string,
  language: string,
  types: string,
  limit: number,
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams({
    q: query,
    types,
    // Nearest to the user first: the same street name exists in many towns.
    proximity: "ip",
    autocomplete: "true",
    country: COUNTRIES,
    language: bareLanguageOf(language),
    limit: String(limit),
    access_token: env.VITE_MAPBOX_TOKEN ?? "",
  })
  const response = await fetch(`${GEOCODING_URL}?${params}`, { signal })
  if (!response.ok) throw new Error(`Address suggestions failed: ${response.status}`)
  return responseSchema.parse(await response.json()).features.map(toSuggestion)
}

/**
 * `isStreetWanted`: a whole street can be used as it is (or taken over by the
 * caller); without it only exact addresses are asked for.
 */
export const addressSuggestionsQueryOptions = (
  query: string,
  language: string,
  isStreetWanted = true,
) =>
  queryOptions({
    queryKey: [
      "geo",
      "address-suggestions",
      bareLanguageOf(language),
      query,
      isStreetWanted,
    ] as const,
    queryFn: ({ signal }) =>
      askGeocoder(query, language, typesFor(query, isStreetWanted), MAX_SUGGESTIONS, signal),
    enabled: hasAddressSuggestions() && query.trim().length >= MIN_ADDRESS_QUERY_LENGTH,
    // The same text gives the same suggestions for a while; typing back and forth is free.
    staleTime: 5 * 60 * 1000,
  })

const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()
const digitsOf = (text: string) => text.replace(/\D/g, "")
const GEOCODE_TIMEOUT_MS = 5000

type TypedAddress = { street: string; city: string; postalCode: string }

/**
 * Finds the position of an address that was typed by hand (or finished by
 * hand after a street was picked). Gives null rather than a guess: without a
 * house number, with no answer, or when the answer is another town.
 */
export async function geocodeAddress(
  { street, city, postalCode }: TypedAddress,
  language: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!hasAddressSuggestions() || !HAS_HOUSE_NUMBER.test(street)) return null
  try {
    const [hit] = await askGeocoder(
      `${street}, ${postalCode} ${city}`.trim(),
      language,
      "address",
      1,
      AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    )
    if (!hit) return null
    const { address } = hit
    const wantedCity = plain(city)
    const foundCity = plain(address.city)
    const isSameCity =
      wantedCity !== "" &&
      foundCity !== "" &&
      (foundCity.includes(wantedCity) || wantedCity.includes(foundCity))
    const isSamePostcode =
      digitsOf(postalCode) !== "" && digitsOf(postalCode) === digitsOf(address.postalCode)
    return isSameCity || isSamePostcode
      ? { latitude: address.latitude, longitude: address.longitude }
      : null
  } catch {
    // No answer is the same as an address typed by hand without a map.
    return null
  }
}

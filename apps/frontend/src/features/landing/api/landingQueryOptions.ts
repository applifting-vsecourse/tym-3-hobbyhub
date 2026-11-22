import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventTotalSchema, landingSchema } from "@/features/landing/api/landingSchemas"

export const landingKeys = {
  all: () => ["landing"] as const,
  // The rows depend on who asks (their friends, their activities) and, for a
  // visitor, on the city they picked.
  rows: (viewerId: string | null, city: string | null) =>
    [...landingKeys.all(), "rows", viewerId, city] as const,
  freeCount: () => [...landingKeys.all(), "free-count"] as const,
}

/** #215: the pre-filtered rows; `city` is the visitor's pick for "Ve tvém okolí". */
export const landingQueryOptions = (viewerId: string | null, city: string | null) =>
  queryOptions({
    queryKey: landingKeys.rows(viewerId, city),
    queryFn: async () => {
      const searchParams = city ? { city } : undefined
      return landingSchema.parse(await api.get("landing", { searchParams }).json())
    },
  })

/** How many upcoming events still have a free seat, for the hero's line. */
export const freeEventsCountQueryOptions = () =>
  queryOptions({
    queryKey: landingKeys.freeCount(),
    queryFn: async () => {
      const searchParams = { limit: "1", offset: "0", onlyWithFreeSpots: "true" }
      return eventTotalSchema.parse(await api.get("events", { searchParams }).json()).total
    },
  })

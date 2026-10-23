import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, type EventListFilters } from "@/features/event/api/eventKeys"
import { eventListSchema, type EventListItem } from "@/features/event/api/eventSchemas"

const EVENTS_PAGE_SIZE = 20
// The most the server returns at once, and how many requests the map makes at
// most: 500 events on one map are more than anyone can read.
const MAP_PAGE_SIZE = 50
const MAP_MAX_PAGES = 10

export const NO_FILTERS: EventListFilters = { activityIds: [], search: "", location: "" }

// Offset paging: the list is sorted by start time, and a page starts after the
// events already loaded. Every filter combination is its own list.
export const eventsQueryOptions = (filters: EventListFilters = NO_FILTERS) =>
  infiniteQueryOptions({
    queryKey: eventKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams({
        limit: String(EVENTS_PAGE_SIZE),
        offset: String(pageParam),
      })
      for (const id of filters.activityIds) searchParams.append("activityIds", id)
      if (filters.search) searchParams.set("search", filters.search)
      if (filters.location) searchParams.set("location", filters.location)
      if (filters.near) {
        searchParams.set("lat", String(filters.near.latitude))
        searchParams.set("lng", String(filters.near.longitude))
      }
      return eventListSchema.parse(await api.get("events", { searchParams }).json())
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
  })

// The map shows every event of the filter, not one page of the list: it asks
// page after page until it has them all (or hit the cap).
export const eventsMapQueryOptions = (filters: EventListFilters = NO_FILTERS) =>
  queryOptions({
    queryKey: eventKeys.map(filters),
    queryFn: async () => {
      const items: EventListItem[] = []
      for (let page = 0; page < MAP_MAX_PAGES; page += 1) {
        const searchParams = new URLSearchParams({
          limit: String(MAP_PAGE_SIZE),
          offset: String(items.length),
        })
        for (const id of filters.activityIds) searchParams.append("activityIds", id)
        if (filters.search) searchParams.set("search", filters.search)
        if (filters.location) searchParams.set("location", filters.location)
        if (filters.near) {
          searchParams.set("lat", String(filters.near.latitude))
          searchParams.set("lng", String(filters.near.longitude))
        }
        const result = eventListSchema.parse(await api.get("events", { searchParams }).json())
        items.push(...result.items)
        if (items.length >= result.total || result.items.length === 0) break
      }
      return items
    },
  })

// The first `limit` events of the unfiltered list: what the landing page shows.
export const upcomingEventsQueryOptions = (limit: number) =>
  queryOptions({
    queryKey: eventKeys.upcoming(limit),
    queryFn: async () =>
      eventListSchema.parse(
        await api.get("events", { searchParams: { limit: String(limit), offset: "0" } }).json(),
      ),
  })

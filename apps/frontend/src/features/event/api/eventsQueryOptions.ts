import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, type EventListFilters } from "@/features/event/api/eventKeys"
import { eventListSchema } from "@/features/event/api/eventSchemas"

const EVENTS_PAGE_SIZE = 20
// The most the server returns at once, and how many requests the map makes at
// most: 500 events on one map are more than anyone can read.
const MAP_PAGE_SIZE = 50
const MAP_MAX_PAGES = 10

// The list and the map ask the server the same question, so they show the same events.
const filterSearchParams = (filters: EventListFilters, limit: number, offset: number) => {
  const searchParams = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  for (const id of filters.activityIds) searchParams.append("activityIds", id)
  if (filters.search) searchParams.set("search", filters.search)
  if (filters.location) searchParams.set("location", filters.location)
  if (filters.dateFrom) searchParams.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) searchParams.set("dateTo", filters.dateTo)
  if (filters.near) {
    searchParams.set("lat", String(filters.near.latitude))
    searchParams.set("lng", String(filters.near.longitude))
  }
  return searchParams
}

export const NO_FILTERS: EventListFilters = { activityIds: [], search: "", location: "" }

// Offset paging: the list is sorted by start time, and a page starts after the
// events already loaded. Every filter combination is its own list.
export const eventsQueryOptions = (filters: EventListFilters = NO_FILTERS) =>
  infiniteQueryOptions({
    queryKey: eventKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const searchParams = filterSearchParams(filters, EVENTS_PAGE_SIZE, pageParam)
      return eventListSchema.parse(await api.get("events", { searchParams }).json())
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
  })

// The map shows every event of the filter, not one page of the list. The first
// page says how many there are; the other pages (up to the cap) are asked for
// together instead of one after another.
export const eventsMapQueryOptions = (filters: EventListFilters = NO_FILTERS) =>
  queryOptions({
    queryKey: eventKeys.map(filters),
    queryFn: async () => {
      const fetchPage = async (offset: number) => {
        const searchParams = filterSearchParams(filters, MAP_PAGE_SIZE, offset)
        return eventListSchema.parse(await api.get("events", { searchParams }).json())
      }
      const first = await fetchPage(0)
      const pages = Math.min(MAP_MAX_PAGES, Math.ceil(first.total / MAP_PAGE_SIZE))
      const rest = await Promise.all(
        Array.from({ length: Math.max(pages - 1, 0) }, (_, index) =>
          fetchPage((index + 1) * MAP_PAGE_SIZE),
        ),
      )
      return [first, ...rest].flatMap((page) => page.items)
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

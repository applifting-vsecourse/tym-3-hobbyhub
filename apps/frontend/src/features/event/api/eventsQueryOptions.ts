import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys, type EventListFilters } from "@/features/event/api/eventKeys"
import { eventListSchema } from "@/features/event/api/eventSchemas"

const EVENTS_PAGE_SIZE = 20

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
      return eventListSchema.parse(await api.get("events", { searchParams }).json())
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
  })

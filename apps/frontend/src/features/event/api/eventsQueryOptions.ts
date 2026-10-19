import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { eventListSchema } from "@/features/event/api/eventSchemas"

export const EVENTS_PAGE_SIZE = 20

// Offset paging: the list is sorted by start time, and a page starts after the
// events already loaded.
export const eventsQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: eventKeys.lists(),
    queryFn: async ({ pageParam }) =>
      eventListSchema.parse(
        await api
          .get("events", { searchParams: { limit: EVENTS_PAGE_SIZE, offset: pageParam } })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
  })

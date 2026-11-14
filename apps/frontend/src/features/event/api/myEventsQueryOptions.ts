import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { myEventsKeys } from "@/lib/my-events-keys"

import { type EventListFilters } from "@/features/event/api/eventKeys"
import { filterSearchParams, NO_FILTERS } from "@/features/event/api/eventsQueryOptions"
import {
  hostedEventsPageSchema,
  myApplicationsPageSchema,
} from "@/features/event/api/myEventsSchemas"

const MY_EVENTS_PAGE_SIZE = 20

// The overview is kept for a minute. Sending, withdrawing and deciding requests
// and creating, editing or cancelling events invalidate it, so it still shows
// the change at once.
const MY_EVENTS_STALE_TIME = 60_000

// The overview is sorted by the server (what is still on first), never by distance.
type MyEventsFilters = Omit<EventListFilters, "near">

// Offset paging, like the event list, and the same filter (#177). The
// applications page says where the next one starts, because the server may
// skip a row it cannot show; the hosted list drops nothing, so its next page
// starts after the rows it has.
export const myApplicationsQueryOptions = (userId: string, filters: MyEventsFilters = NO_FILTERS) =>
  infiniteQueryOptions({
    queryKey: myEventsKeys.applications(userId, filters),
    staleTime: MY_EVENTS_STALE_TIME,
    queryFn: async ({ pageParam }) =>
      myApplicationsPageSchema.parse(
        await api
          .get("my-events/applications", {
            searchParams: filterSearchParams(filters, MY_EVENTS_PAGE_SIZE, pageParam),
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  })

export const myHostedEventsQueryOptions = (userId: string, filters: MyEventsFilters = NO_FILTERS) =>
  infiniteQueryOptions({
    queryKey: myEventsKeys.hosted(userId, filters),
    staleTime: MY_EVENTS_STALE_TIME,
    queryFn: async ({ pageParam }) =>
      hostedEventsPageSchema.parse(
        await api
          .get("my-events/hosted", {
            searchParams: filterSearchParams(filters, MY_EVENTS_PAGE_SIZE, pageParam),
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      const next = lastPageParam + lastPage.items.length
      return next < lastPage.total && lastPage.items.length > 0 ? next : undefined
    },
  })

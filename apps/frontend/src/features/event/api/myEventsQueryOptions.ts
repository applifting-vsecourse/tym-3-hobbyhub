import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { myEventsKeys } from "@/lib/my-events-keys"

import { eventListSchema } from "@/features/event/api/eventSchemas"
import { myApplicationsPageSchema } from "@/features/event/api/myEventsSchemas"

const MY_EVENTS_PAGE_SIZE = 20

// The overview is kept for a minute. Sending, withdrawing and deciding requests
// and creating, editing or cancelling events invalidate it, so it still shows
// the change at once.
const MY_EVENTS_STALE_TIME = 60_000

// Offset paging, like the event list. The applications page says where the
// next one starts, because the server may skip a row it cannot show; the hosted
// list drops nothing, so its next page starts after the rows it has.
export const myApplicationsQueryOptions = (userId: string) =>
  infiniteQueryOptions({
    queryKey: myEventsKeys.applications(userId),
    staleTime: MY_EVENTS_STALE_TIME,
    queryFn: async ({ pageParam }) =>
      myApplicationsPageSchema.parse(
        await api
          .get("my-events/applications", {
            searchParams: { limit: String(MY_EVENTS_PAGE_SIZE), offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  })

export const myHostedEventsQueryOptions = (userId: string) =>
  infiniteQueryOptions({
    queryKey: myEventsKeys.hosted(userId),
    staleTime: MY_EVENTS_STALE_TIME,
    queryFn: async ({ pageParam }) =>
      eventListSchema.parse(
        await api
          .get("my-events/hosted", {
            searchParams: { limit: String(MY_EVENTS_PAGE_SIZE), offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      const next = lastPageParam + lastPage.items.length
      return next < lastPage.total && lastPage.items.length > 0 ? next : undefined
    },
  })

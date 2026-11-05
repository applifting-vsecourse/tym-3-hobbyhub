import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventListSchema } from "@/features/event/api/eventSchemas"
import { myApplicationsPageSchema } from "@/features/event/api/myEventsSchemas"

const MY_EVENTS_PAGE_SIZE = 20

export const myEventsKeys = {
  all: () => ["my-events"] as const,
  // Per user, so the next person signing in on this device never sees the
  // overview of the one before.
  applications: (userId: string) => [...myEventsKeys.all(), "applications", userId] as const,
  hosted: (userId: string) => [...myEventsKeys.all(), "hosted", userId] as const,
}

// Offset paging, like the event list: a page starts after the rows loaded.
const nextOffset = (loaded: number, total: number, lastPageSize: number) =>
  loaded < total && lastPageSize > 0 ? loaded : undefined

// Requests are sent and decided on other pages, so the overview reloads
// whenever it is opened.
export const myApplicationsQueryOptions = (userId: string) =>
  infiniteQueryOptions({
    queryKey: myEventsKeys.applications(userId),
    refetchOnMount: "always",
    queryFn: async ({ pageParam }) =>
      myApplicationsPageSchema.parse(
        await api
          .get("my-events/applications", {
            searchParams: { limit: String(MY_EVENTS_PAGE_SIZE), offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      nextOffset(
        pages.reduce((sum, page) => sum + page.items.length, 0),
        lastPage.total,
        lastPage.items.length,
      ),
  })

export const myHostedEventsQueryOptions = (userId: string) =>
  infiniteQueryOptions({
    queryKey: myEventsKeys.hosted(userId),
    refetchOnMount: "always",
    queryFn: async ({ pageParam }) =>
      eventListSchema.parse(
        await api
          .get("my-events/hosted", {
            searchParams: { limit: String(MY_EVENTS_PAGE_SIZE), offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      nextOffset(
        pages.reduce((sum, page) => sum + page.items.length, 0),
        lastPage.total,
        lastPage.items.length,
      ),
  })

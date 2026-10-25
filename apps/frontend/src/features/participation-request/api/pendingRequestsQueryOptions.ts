import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"
import { pendingRequestPageSchema } from "@/features/participation-request/api/participationRequestSchemas"

const PENDING_REQUESTS_PAGE_SIZE = 20

// Offset paging like the event list, oldest request first. A decision takes a
// request out of the list, so the pages are refetched after it instead of the
// request being dropped from the cache: the offsets would skip requests.
export const pendingRequestsQueryOptions = (eventId: string) =>
  infiniteQueryOptions({
    queryKey: participationRequestKeys.pending(eventId),
    queryFn: async ({ pageParam }) =>
      pendingRequestPageSchema.parse(
        await api
          .get(`events/${eventId}/requests`, {
            searchParams: { limit: String(PENDING_REQUESTS_PAGE_SIZE), offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
  })

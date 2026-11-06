import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"
import {
  decidedRequestPageSchema,
  type DecidedStatus,
} from "@/features/participation-request/api/participationRequestSchemas"

const DECIDED_REQUESTS_PAGE_SIZE = 20

// One state of the participants tab (F-05.6), the latest change first, paged
// like the waiting requests.
export const decidedRequestsQueryOptions = (eventId: string, status: DecidedStatus) =>
  infiniteQueryOptions({
    queryKey: participationRequestKeys.decided(eventId, status),
    queryFn: async ({ pageParam }) =>
      decidedRequestPageSchema.parse(
        await api
          .get(`events/${eventId}/requests/decided`, {
            searchParams: {
              status,
              limit: String(DECIDED_REQUESTS_PAGE_SIZE),
              offset: String(pageParam),
            },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
  })

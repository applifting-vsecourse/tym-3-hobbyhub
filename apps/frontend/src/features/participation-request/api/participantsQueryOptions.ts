import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"
import {
  participantPageSchema,
  type SeatStatus,
} from "@/features/participation-request/api/participationRequestSchemas"

const PARTICIPANTS_PAGE_SIZE = 20

// One state of the participants tab (F-05.6, F-06.4), the latest change first,
// paged like the requests.
export const participantsQueryOptions = (eventId: string, status: SeatStatus) =>
  infiniteQueryOptions({
    queryKey: participationRequestKeys.participants(eventId, status),
    queryFn: async ({ pageParam }) =>
      participantPageSchema.parse(
        await api
          .get(`events/${eventId}/participations`, {
            searchParams: {
              status,
              limit: String(PARTICIPANTS_PAGE_SIZE),
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

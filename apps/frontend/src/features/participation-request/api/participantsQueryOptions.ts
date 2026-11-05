import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"
import { participantPageSchema } from "@/features/participation-request/api/participationRequestSchemas"

const PARTICIPANTS_PAGE_SIZE = 20

/** The people with an approved seat on the event, for its organizer (F-04.2). */
export const participantsQueryOptions = (eventId: string) =>
  infiniteQueryOptions({
    queryKey: participationRequestKeys.participants(eventId),
    queryFn: async ({ pageParam }) =>
      participantPageSchema.parse(
        await api
          .get(`events/${eventId}/participants`, {
            searchParams: { limit: String(PARTICIPANTS_PAGE_SIZE), offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
  })

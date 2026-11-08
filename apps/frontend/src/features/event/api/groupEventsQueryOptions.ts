import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { groupEventPageSchema, type GroupEventPeriod } from "@/features/event/api/eventSchemas"

/**
 * F-07.2: the events of a group, a page at a time (the server sets the size).
 * Offset paging like the other event lists; the next page starts after the
 * rows already loaded.
 */
export const groupEventsQueryOptions = (
  groupId: string,
  period: GroupEventPeriod,
  viewer: { userId: string | null; isMember: boolean },
) =>
  infiniteQueryOptions({
    queryKey: eventKeys.groupEvents(groupId, period, viewer.userId, viewer.isMember),
    queryFn: async ({ pageParam }) =>
      groupEventPageSchema.parse(
        await api
          .get(`groups/${groupId}/events`, {
            searchParams: { period, offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      const next = lastPageParam + lastPage.items.length
      return next < lastPage.total && lastPage.items.length > 0 ? next : undefined
    },
  })

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { notificationKeys } from "@/features/notification/api/notificationKeys"
import {
  notificationCountSchema,
  notificationPageSchema,
} from "@/features/notification/api/notificationSchemas"

/** The bell shows this many; the page loads more in steps of the same size. */
export const NOTIFICATIONS_PAGE_SIZE = 10

/** How often the bell asks for the number of unread notifications. */
export const UNREAD_COUNT_REFETCH_MS = 60_000

// Offset paging like the event list, newest first. Marking something read
// changes no order, so a page fetched again lands on the same items.
export const notificationsQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: notificationKeys.list(),
    queryFn: async ({ pageParam }) =>
      notificationPageSchema.parse(
        await api
          .get("notifications", {
            searchParams: { limit: String(NOTIFICATIONS_PAGE_SIZE), offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
  })

// Polled: a new notification shows on the bell within a minute without a
// reload, and at once when the tab regains focus (the client's default).
export const unreadCountQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () =>
      notificationCountSchema.parse(await api.get("notifications/unread-count").json()),
    refetchInterval: UNREAD_COUNT_REFETCH_MS,
  })

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import {
  notificationKeys,
  type NotificationListFilter,
} from "@/features/notification/api/notificationKeys"
import {
  notificationCountSchema,
  notificationPageSchema,
} from "@/features/notification/api/notificationSchemas"

/** The bell shows this many; the page loads more in steps of the same size. */
export const NOTIFICATIONS_PAGE_SIZE = 10

/** How often the bell asks for the number of unread notifications. */
export const UNREAD_COUNT_REFETCH_MS = 60_000

/** The filter as query parameters; a field left out is no filter. */
const searchParamsOf = (filter: NotificationListFilter): Record<string, string> => ({
  ...(filter.read === undefined ? {} : { read: String(filter.read) }),
  ...(filter.kind === undefined ? {} : { kind: filter.kind }),
})

// Offset paging like the event list, newest first. Marking something read
// moves it from the unread list to the read one; the refetch after it asks
// for every loaded page again from the first, with offsets counted from the
// fresh pages, so nothing is skipped or shown twice.
export const notificationsQueryOptions = (filter: NotificationListFilter = {}) =>
  infiniteQueryOptions({
    queryKey: notificationKeys.list(filter),
    queryFn: async ({ pageParam }) =>
      notificationPageSchema.parse(
        await api
          .get("notifications", {
            searchParams: {
              limit: String(NOTIFICATIONS_PAGE_SIZE),
              offset: String(pageParam),
              ...searchParamsOf(filter),
            },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
      return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
    },
    // No placeholder from the previous kind: a switched filter shows the
    // loader, then its own rows or its own error, never the old kind's rows.
    // A list that failed stays failed until "Zkusit znovu": the page swaps
    // its loader for the lists, and a list fetching again just by appearing
    // would bring the loader back, and so on in a circle.
    retryOnMount: false,
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

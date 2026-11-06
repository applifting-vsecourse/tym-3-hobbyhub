import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query"

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
    // Switching the kind keeps the old rows until the new ones arrive,
    // instead of flashing a loader.
    placeholderData: keepPreviousData,
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

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { friendshipKeys } from "@/features/friendship/api/friendshipKeys"
import {
  FRIEND_SEARCH_MIN_LENGTH,
  friendRequestCountSchema,
  friendSearchPageSchema,
  receivedFriendRequestPageSchema,
} from "@/features/friendship/api/friendshipSchemas"

/** #225: people whose nickname contains the text, a page at a time. */
export const friendSearchQueryOptions = (text: string) =>
  infiniteQueryOptions({
    queryKey: friendshipKeys.search(text),
    queryFn: async ({ pageParam }) =>
      friendSearchPageSchema.parse(
        await api
          .get("friends/search", {
            searchParams: pageParam ? { q: text, offset: pageParam } : { q: text },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: text.length >= FRIEND_SEARCH_MIN_LENGTH,
  })

/**
 * #228: the requests waiting for me, newest first, 20 at a time. The first
 * page also carries how many there are, for the number on the tab.
 */
export const receivedFriendRequestsQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: friendshipKeys.received(),
    queryFn: async ({ pageParam }) =>
      receivedFriendRequestPageSchema.parse(
        await api
          .get("friends/requests/received", {
            searchParams: pageParam ? { offset: pageParam } : {},
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  })

/** As often as the bell asks for its number, so the two agree (review #257). */
const RECEIVED_COUNT_REFETCH_MS = 60_000

/**
 * #228: how many requests wait for me, without loading them (the tab's
 * number). Asked again every minute and on coming back to the window, so a
 * new request shows without reloading the page.
 */
export const receivedFriendRequestCountQueryOptions = () =>
  queryOptions({
    queryKey: friendshipKeys.receivedCount(),
    refetchInterval: RECEIVED_COUNT_REFETCH_MS,
    queryFn: async () =>
      friendRequestCountSchema.parse(await api.get("friends/requests/received/count").json()).count,
  })

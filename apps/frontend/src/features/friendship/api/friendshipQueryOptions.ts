import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { friendshipKeys } from "@/features/friendship/api/friendshipKeys"
import {
  FRIEND_SEARCH_MIN_LENGTH,
  friendCountSchema,
  friendPageSchema,
  friendRequestCountSchema,
  friendSearchPageSchema,
  receivedFriendRequestPageSchema,
  type FriendListSort,
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

/** #226: my friends in the chosen order, 20 at a time, with how many there are. */
export const friendsListQueryOptions = (sort: FriendListSort) =>
  infiniteQueryOptions({
    queryKey: friendshipKeys.list(sort),
    queryFn: async ({ pageParam }) =>
      friendPageSchema.parse(
        await api
          .get("friends", {
            searchParams: pageParam ? { sort, offset: pageParam } : { sort },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  })

/** #226: how many friends I have, without loading them (the tab's number). */
export const friendCountQueryOptions = () =>
  queryOptions({
    queryKey: friendshipKeys.count(),
    queryFn: async () => friendCountSchema.parse(await api.get("friends/count").json()).count,
  })

/** #228: how many requests wait for me, without loading them (the tab's number). */
export const receivedFriendRequestCountQueryOptions = () =>
  queryOptions({
    queryKey: friendshipKeys.receivedCount(),
    queryFn: async () =>
      friendRequestCountSchema.parse(await api.get("friends/requests/received/count").json()).count,
  })

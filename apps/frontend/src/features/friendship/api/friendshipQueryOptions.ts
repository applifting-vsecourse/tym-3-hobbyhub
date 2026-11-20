import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { friendshipKeys } from "@/features/friendship/api/friendshipKeys"
import {
  FRIEND_SEARCH_MIN_LENGTH,
  friendSearchPageSchema,
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

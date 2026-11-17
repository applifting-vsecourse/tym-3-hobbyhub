import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { ratingKeys } from "@/features/rating/api/ratingKeys"
import {
  eventRatingStateSchema,
  givenRatingPageSchema,
  receivedRatingPageSchema,
  type RatingDirection,
} from "@/features/rating/api/ratingSchemas"

const RATINGS_PAGE_SIZE = 20

const nextOffset = (
  lastPage: { items: unknown[]; total: number },
  pages: { items: unknown[] }[],
) => {
  const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
  return loaded < lastPage.total && lastPage.items.length > 0 ? loaded : undefined
}

/**
 * Who the signed-in person may rate at the event, what they gave and until
 * when. Answers 404 to someone who neither had a seat nor runs the event.
 */
export const eventRatingStateQueryOptions = (eventId: string, userId: string) =>
  queryOptions({
    queryKey: ratingKeys.eventState(eventId, userId),
    queryFn: async () =>
      eventRatingStateSchema.parse(await api.get(`events/${eventId}/ratings`).json()),
  })

/** "Moje hodnocení": the revealed ratings received one way, newest first. */
export const receivedRatingsQueryOptions = (userId: string, direction: RatingDirection) =>
  infiniteQueryOptions({
    queryKey: ratingKeys.received(userId, direction),
    queryFn: async ({ pageParam }) =>
      receivedRatingPageSchema.parse(
        await api
          .get("ratings/received", {
            searchParams: {
              direction,
              limit: String(RATINGS_PAGE_SIZE),
              offset: String(pageParam),
            },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  })

/** The ratings the person gave, newest first, revealed or not. */
export const givenRatingsQueryOptions = (userId: string) =>
  infiniteQueryOptions({
    queryKey: ratingKeys.given(userId),
    queryFn: async ({ pageParam }) =>
      givenRatingPageSchema.parse(
        await api
          .get("ratings/given", {
            searchParams: { limit: String(RATINGS_PAGE_SIZE), offset: String(pageParam) },
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  })

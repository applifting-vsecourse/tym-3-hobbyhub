import { infiniteQueryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import {
  friendsEventPageSchema,
  personEventPageSchema,
  type GroupEventPeriod,
  type PersonEventPage,
} from "@/features/event/api/eventSchemas"

/**
 * #226: „Akce přátel“, the upcoming events my friends go to or organize,
 * soonest first, 10 at a time. The few above the friends list are its first page.
 */
export const friendsEventsQueryOptions = (viewerId: string) =>
  infiniteQueryOptions({
    queryKey: eventKeys.friendsEvents(viewerId),
    queryFn: async ({ pageParam }) =>
      friendsEventPageSchema.parse(
        await api
          .get("friends/events", { searchParams: pageParam ? { offset: pageParam } : {} })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  })

/**
 * #226: a friend's upcoming or past events on their profile. The first page
 * comes with the profile; the further ones load from here.
 */
export const personEventsQueryOptions = (
  userId: string,
  period: GroupEventPeriod,
  firstPage: { page: PersonEventPage; loadedAt: number },
) =>
  infiniteQueryOptions({
    queryKey: eventKeys.personEvents(userId, period),
    queryFn: async ({ pageParam }) =>
      personEventPageSchema.parse(
        await api
          .get(`profile/${encodeURIComponent(userId)}/events/${period}`, {
            searchParams: pageParam ? { offset: pageParam } : {},
          })
          .json(),
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialData: { pages: [firstPage.page], pageParams: [0] },
    // Fresh as long as the profile it came with: no second load on opening.
    initialDataUpdatedAt: firstPage.loadedAt,
    staleTime: 30_000,
  })

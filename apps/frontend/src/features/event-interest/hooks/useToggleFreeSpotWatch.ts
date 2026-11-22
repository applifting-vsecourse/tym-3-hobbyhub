import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { myEventsKeys } from "@/lib/my-events-keys"

import {
  unwatchFreeSpot,
  watchFreeSpot,
  WatchRefusedError,
} from "@/features/event-interest/api/eventInterest"
import { eventInterestKeys } from "@/features/event-interest/api/eventInterestKeys"
import type { EventInterestState } from "@/features/event-interest/api/eventInterestSchemas"

export type FreeSpotWatchChange = { eventId: string; shouldWatch: boolean }

/** What this hook reads of a page of the "Zajímá mě" list; the event feature owns its schema. */
type InterestedPage = { items: { id: string; watchesFreeSpot: boolean }[] }

type Snapshot = {
  state: EventInterestState | undefined
  lists: [QueryKey, InfiniteData<InterestedPage> | undefined][]
}

/**
 * #232: starts (`shouldWatch`) or stops watching a full event for a free seat,
 * on the detail and in the rows of "Zajímá mě". The control flips at once, on
 * both; watching saves the event to the list too. A failure flips it back,
 * says so, and calls `onFailure`, where the page refreshes the event: a seat
 * may have freed up meanwhile, and then the way to join is what to show.
 * Taps run one after another (the mutation scope), so a quick double tap ends
 * in the state of the last one.
 */
export function useToggleFreeSpotWatch(
  userId: string,
  { onFailure }: { onFailure?: (eventId: string) => void } = {},
) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "free-spot-watch" },
    mutationFn: async ({ eventId, shouldWatch }: FreeSpotWatchChange): Promise<void> => {
      if (shouldWatch) await watchFreeSpot(eventId)
      else await unwatchFreeSpot(eventId)
    },
    onMutate: async ({ eventId, shouldWatch }): Promise<Snapshot> => {
      const stateKey = eventInterestKeys.state(eventId, userId)
      await Promise.all([
        queryClient.cancelQueries({ queryKey: stateKey }),
        queryClient.cancelQueries({ queryKey: myEventsKeys.interestedAll() }),
      ])
      const snapshot: Snapshot = {
        state: queryClient.getQueryData<EventInterestState>(stateKey),
        lists: queryClient.getQueriesData<InfiniteData<InterestedPage>>({
          queryKey: myEventsKeys.interestedAll(),
        }),
      }
      if (snapshot.state) {
        queryClient.setQueryData<EventInterestState>(stateKey, {
          ...snapshot.state,
          isWatching: shouldWatch,
          isSaved: shouldWatch || snapshot.state.isSaved,
        })
      }
      queryClient.setQueriesData<InfiniteData<InterestedPage>>(
        { queryKey: myEventsKeys.interestedAll() },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === eventId ? { ...item, watchesFreeSpot: shouldWatch } : item,
              ),
            })),
          },
      )
      return snapshot
    },
    onError: (error, { eventId, shouldWatch }, snapshot) => {
      if (snapshot?.state) {
        queryClient.setQueryData(eventInterestKeys.state(eventId, userId), snapshot.state)
      }
      for (const [queryKey, data] of snapshot?.lists ?? []) queryClient.setQueryData(queryKey, data)
      const isNowFree =
        error instanceof WatchRefusedError && error.violations.includes("EVENT_NOT_FULL")
      toast.error(
        t(
          isNowFree
            ? "interest.watch.nowFree"
            : shouldWatch
              ? "interest.watch.startError"
              : "interest.watch.stopError",
        ),
      )
      onFailure?.(eventId)
    },
    onSettled: (_data, _error, { eventId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventInterestKeys.state(eventId, userId) }),
        queryClient.invalidateQueries({ queryKey: myEventsKeys.interestedAll() }),
      ]),
  })
}

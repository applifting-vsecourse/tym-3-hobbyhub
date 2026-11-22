import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { myEventsKeys } from "@/lib/my-events-keys"

import { removeEventInterest, saveEventInterest } from "@/features/event-interest/api/eventInterest"
import { eventInterestKeys } from "@/features/event-interest/api/eventInterestKeys"
import type { EventInterestState } from "@/features/event-interest/api/eventInterestSchemas"

/**
 * #231: saves the event to the "Zajímá mě" list (`true`) or removes it
 * (`false`). The button flips at once; a failure flips it back and says so.
 * Taps on one event run one after another (the mutation scope), so a quick
 * double tap ends in the state of the last tap, never in a race.
 */
export function useToggleEventInterest(eventId: string, userId: string) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const queryKey = eventInterestKeys.state(eventId, userId)

  return useMutation({
    scope: { id: `event-interest-${eventId}` },
    mutationFn: async (shouldSave: boolean): Promise<void> => {
      if (shouldSave) await saveEventInterest(eventId)
      else await removeEventInterest(eventId)
    },
    onMutate: async (shouldSave) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<EventInterestState>(queryKey)
      // #232: the watching goes with the row.
      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          isSaved: shouldSave,
          isWatching: shouldSave && previous.isWatching,
        })
      }
      return { previous }
    },
    onError: (_error, shouldSave, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error(t(shouldSave ? "interest.saveError" : "interest.removeError"))
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: myEventsKeys.interestedAll() }),
      ]),
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { myEventsKeys } from "@/lib/my-events-keys"

import { cancelParticipation } from "@/features/participation-request/api/cancelParticipation"
import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"

/** `onChange` refreshes what the page shows around the seat: the event, its roster. */
export function useCancelParticipation(onChange?: () => Promise<unknown>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelParticipation,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: participationRequestKeys.all() }),
        // The overview (F-06.3) shows the seat as "Odhlášeno" from now on.
        queryClient.invalidateQueries({ queryKey: myEventsKeys.all() }),
        onChange?.(),
      ]),
  })
}

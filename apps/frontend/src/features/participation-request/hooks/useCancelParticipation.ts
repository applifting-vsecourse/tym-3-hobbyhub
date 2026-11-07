import { useMutation, useQueryClient } from "@tanstack/react-query"

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
        onChange?.(),
      ]),
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"
import { requestToJoin } from "@/features/participation-request/api/requestToJoin"

/**
 * `onChange` refreshes what the page shows around the request, e.g. the event.
 * It runs after a refusal too: that usually means the event filled up or
 * another window has already sent a request.
 */
export function useRequestToJoin(onChange?: () => Promise<unknown>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: requestToJoin,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: participationRequestKeys.all() }),
        onChange?.(),
      ]),
  })
}

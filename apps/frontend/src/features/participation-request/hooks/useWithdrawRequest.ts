import { useMutation, useQueryClient } from "@tanstack/react-query"

import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"
import { withdrawRequest } from "@/features/participation-request/api/withdrawRequest"

/** `onChange` refreshes what the page shows around the request, e.g. the event. */
export function useWithdrawRequest(onChange?: () => Promise<unknown>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: withdrawRequest,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: participationRequestKeys.all() }),
        onChange?.(),
      ]),
  })
}

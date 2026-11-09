import { useMutation, useQueryClient } from "@tanstack/react-query"

import { approveRequest, rejectRequest } from "@/features/participation-request/api/decideRequest"
import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"

/**
 * After a decision, or a refusal of one (the event filled up, the request was
 * withdrawn meanwhile), the list is fetched again. `onChange` refreshes what
 * the page shows around it, e.g. the seat counts of the event.
 */
function useRefreshAfterDecision(eventId: string, onChange?: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: participationRequestKeys.pending(eventId) }),
      // A rejection joins the decided requests, an approval the participants.
      queryClient.invalidateQueries({ queryKey: participationRequestKeys.decidedAll(eventId) }),
      queryClient.invalidateQueries({
        queryKey: participationRequestKeys.participantsAll(eventId),
      }),
      onChange?.(),
    ])
}

export function useApproveRequest(eventId: string, onChange?: () => Promise<unknown>) {
  const refresh = useRefreshAfterDecision(eventId, onChange)
  return useMutation({
    mutationFn: ({ requestId, message }: { requestId: string; message?: string }) =>
      approveRequest({ eventId, requestId, message }),
    onSettled: refresh,
  })
}

export function useRejectRequest(eventId: string, onChange?: () => Promise<unknown>) {
  const refresh = useRefreshAfterDecision(eventId, onChange)
  return useMutation({
    mutationFn: ({ requestId, message }: { requestId: string; message?: string }) =>
      rejectRequest({ eventId, requestId, message }),
    onSettled: refresh,
  })
}

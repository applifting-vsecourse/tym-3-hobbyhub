import { useMutation, useQueryClient } from "@tanstack/react-query"

import { myEventsKeys } from "@/lib/my-events-keys"

import { eventKeys } from "@/features/event/api/eventKeys"
import type { CancelEventInput, UpdateEventInput } from "@/features/event/api/eventSchemas"
import { cancelEvent, updateEvent } from "@/features/event/api/updateEvent"

// A changed event shows up in the list, the public detail and the organizer's view.
export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateEventInput) => updateEvent(id, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
        queryClient.invalidateQueries({ queryKey: myEventsKeys.all() }),
      ]),
  })
}

export function useCancelEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CancelEventInput) => cancelEvent(id, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
        queryClient.invalidateQueries({ queryKey: myEventsKeys.all() }),
      ]),
  })
}

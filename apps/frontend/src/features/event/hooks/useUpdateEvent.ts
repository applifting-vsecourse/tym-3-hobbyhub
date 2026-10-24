import { useMutation, useQueryClient } from "@tanstack/react-query"

import { eventKeys } from "@/features/event/api/eventKeys"
import type { CancelEventInput, CreateEventInput } from "@/features/event/api/eventSchemas"
import { cancelEvent, updateEvent } from "@/features/event/api/updateEvent"

// A changed event shows up in the list, the public detail and the organizer's view.
export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEventInput) => updateEvent(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
  })
}

export function useCancelEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CancelEventInput) => cancelEvent(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all() }),
  })
}

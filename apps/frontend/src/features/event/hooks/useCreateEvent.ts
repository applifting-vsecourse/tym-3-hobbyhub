import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createEvent } from "@/features/event/api/createEvent"
import { eventKeys } from "@/features/event/api/eventKeys"

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvent,
    onSuccess: (event) => {
      // The detail page opens next; give it the event without a second request.
      queryClient.setQueryData(eventKeys.detail(event.id), event)
    },
  })
}

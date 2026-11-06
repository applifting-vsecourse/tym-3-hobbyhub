import { useMutation, useQueryClient } from "@tanstack/react-query"

import { myEventsKeys } from "@/lib/my-events-keys"

import { createEvent } from "@/features/event/api/createEvent"

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    // A new event shows under "Pořádám".
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myEventsKeys.all() }),
  })
}

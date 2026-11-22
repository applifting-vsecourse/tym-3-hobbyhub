import { useMutation, useQueryClient } from "@tanstack/react-query"

import { landingKeys } from "@/lib/landing-keys"
import { myEventsKeys } from "@/lib/my-events-keys"

import { createEvent } from "@/features/event/api/createEvent"

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    // A new event shows under "Pořádám".
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: myEventsKeys.all() }),
        // #215: a new event may belong in a landing row.
        queryClient.invalidateQueries({ queryKey: landingKeys.all() }),
      ]),
  })
}

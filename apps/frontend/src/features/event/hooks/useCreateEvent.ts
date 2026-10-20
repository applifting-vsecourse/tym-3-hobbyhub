import { useMutation } from "@tanstack/react-query"

import { createEvent } from "@/features/event/api/createEvent"

export function useCreateEvent() {
  return useMutation({ mutationFn: createEvent })
}

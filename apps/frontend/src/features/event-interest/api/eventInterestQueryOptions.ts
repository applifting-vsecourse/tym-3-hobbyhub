import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventInterestKeys } from "@/features/event-interest/api/eventInterestKeys"
import { eventInterestStateSchema } from "@/features/event-interest/api/eventInterestSchemas"

/** #231: whether the event is on the signed-in person's "Zajímá mě" list and may be saved. */
export const eventInterestQueryOptions = (eventId: string, userId: string) =>
  queryOptions({
    queryKey: eventInterestKeys.state(eventId, userId),
    queryFn: async () =>
      eventInterestStateSchema.parse(await api.get(`events/${eventId}/interest`).json()),
  })

import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { eventSchema } from "@/features/event/api/eventSchemas"

// The organizer's view of an event: every field, address included.
export const manageEventQueryOptions = (id: string) =>
  queryOptions({
    queryKey: eventKeys.managed(id),
    queryFn: async () => eventSchema.parse(await api.get(`events/${id}/manage`).json()),
  })

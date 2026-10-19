import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { eventListSchema } from "@/features/event/api/eventSchemas"

export const eventsQueryOptions = () =>
  queryOptions({
    queryKey: eventKeys.lists(),
    queryFn: async () => eventListSchema.parse(await api.get("events").json()),
  })

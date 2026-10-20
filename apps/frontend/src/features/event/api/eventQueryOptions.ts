import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { eventSchema } from "@/features/event/api/eventSchemas"

export const eventQueryOptions = (id: string) =>
  queryOptions({
    queryKey: eventKeys.detail(id),
    queryFn: async () => eventSchema.parse(await api.get(`events/${id}`).json()),
  })

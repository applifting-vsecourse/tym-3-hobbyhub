import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { eventDetailSchema } from "@/features/event/api/eventSchemas"

export const eventDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: eventKeys.publicDetail(id),
    queryFn: async () => eventDetailSchema.parse(await api.get(`events/${id}`).json()),
  })

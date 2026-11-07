import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { eventDetailSchema } from "@/features/event/api/eventSchemas"

/** `viewerId` is who is signed in, or null: the answer depends on it (F-07.2). */
export const eventDetailQueryOptions = (id: string, viewerId: string | null) =>
  queryOptions({
    queryKey: eventKeys.detailFor(id, viewerId),
    queryFn: async () => eventDetailSchema.parse(await api.get(`events/${id}`).json()),
  })

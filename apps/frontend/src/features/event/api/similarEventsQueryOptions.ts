import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { eventListItemSchema } from "@/features/event/api/eventSchemas"

const similarEventsSchema = z.object({ items: z.array(eventListItemSchema) })

/** `viewerId` is who is signed in, or null: blocked organizers are left out per viewer. */
export const similarEventsQueryOptions = (id: string, viewerId: string | null) =>
  queryOptions({
    queryKey: eventKeys.similarFor(id, viewerId),
    queryFn: async () =>
      similarEventsSchema.parse(await api.get(`events/${id}/similar`).json()).items,
  })

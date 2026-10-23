import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { participationRequestKeys } from "@/features/participation-request/api/participationRequestKeys"
import { myRequestStateSchema } from "@/features/participation-request/api/participationRequestSchemas"

export const myRequestQueryOptions = (eventId: string, userId: string) =>
  queryOptions({
    queryKey: participationRequestKeys.mine(eventId, userId),
    queryFn: async () =>
      myRequestStateSchema.parse(await api.get(`events/${eventId}/requests/mine`).json()),
  })

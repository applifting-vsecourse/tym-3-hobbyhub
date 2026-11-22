import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { groupKeys } from "@/features/group/api/groupKeys"
import { groupStatsSchema } from "@/features/group/api/groupSchemas"

/** What a group's public events say about it: how many were played, how big they were. */
export const groupStatsQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: groupKeys.stats(groupId),
    queryFn: async () => groupStatsSchema.parse(await api.get(`groups/${groupId}/stats`).json()),
  })

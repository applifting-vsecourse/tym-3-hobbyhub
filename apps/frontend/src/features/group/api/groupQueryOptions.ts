import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { groupKeys } from "@/features/group/api/groupKeys"
import { groupSchema } from "@/features/group/api/groupSchemas"

export const groupQueryOptions = (id: string) =>
  queryOptions({
    queryKey: groupKeys.detail(id),
    queryFn: async () => groupSchema.parse(await api.get(`groups/${id}`).json()),
  })

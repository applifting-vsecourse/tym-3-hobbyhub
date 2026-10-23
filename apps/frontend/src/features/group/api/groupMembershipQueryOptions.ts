import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { groupKeys } from "@/features/group/api/groupKeys"
import { groupMembershipSchema } from "@/features/group/api/groupSchemas"

/** Only for a signed-in user: the endpoint answers 401 to a visitor. */
export const groupMembershipQueryOptions = (id: string) =>
  queryOptions({
    queryKey: groupKeys.membership(id),
    queryFn: async () =>
      groupMembershipSchema.parse(await api.get(`groups/${id}/membership`).json()),
  })

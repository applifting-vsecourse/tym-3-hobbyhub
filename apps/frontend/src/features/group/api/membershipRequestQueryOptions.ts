import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import { groupKeys } from "@/features/group/api/groupKeys"
import {
  groupMemberSchema,
  myMembershipRequestStateSchema,
  pendingMembershipRequestSchema,
} from "@/features/group/api/membershipRequestSchemas"

/** Only for a signed-in user: the endpoint answers 401 to a visitor. */
export const myMembershipRequestQueryOptions = (groupId: string, userId: string) =>
  queryOptions({
    queryKey: groupKeys.myRequest(groupId, userId),
    queryFn: async () =>
      myMembershipRequestStateSchema.parse(await api.get(`groups/${groupId}/requests/mine`).json()),
  })

/** Only for the group's admins: anyone else gets 404. */
export const pendingMembershipRequestsQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: groupKeys.requests(groupId),
    queryFn: async () =>
      z
        .array(pendingMembershipRequestSchema)
        .parse(await api.get(`groups/${groupId}/requests`).json()),
  })

/** Only for the group's admins: anyone else gets 404. */
export const groupMembersQueryOptions = (groupId: string) =>
  queryOptions({
    queryKey: groupKeys.members(groupId),
    queryFn: async () =>
      z.array(groupMemberSchema).parse(await api.get(`groups/${groupId}/members`).json()),
  })

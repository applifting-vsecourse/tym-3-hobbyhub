import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { userBlockKeys } from "@/features/user-block/api/userBlockKeys"
import { blockedUsersSchema } from "@/features/user-block/api/userBlockSchemas"

// #65, ADR-0031: the blocker is always the session; only the other person is sent.

export const getBlockedUsers = async () => blockedUsersSchema.parse(await api.get("blocks").json())

export const blockUser = async (userId: string) => {
  await api.post("blocks", { json: { userId } })
}

export const unblockUser = async (userId: string) => {
  await api.delete(`blocks/${encodeURIComponent(userId)}`)
}

export const blockedUsersQueryOptions = () =>
  queryOptions({
    queryKey: userBlockKeys.mine(),
    queryFn: getBlockedUsers,
  })

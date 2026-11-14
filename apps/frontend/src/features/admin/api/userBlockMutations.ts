import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HTTPError } from "ky"

import { adminKeys } from "@/features/admin/api/adminKeys"
import {
  adminUserBlocksSchema,
  userBlockRefusalSchema,
  type UserBlockViolation,
} from "@/features/admin/api/adminSchemas"
import { adminApi } from "@/features/admin/lib/admin-api"

/** The server refused for a reason the page can explain, e.g. the pair is blocked already. */
export class UserBlockRefusedError extends Error {
  constructor(readonly violations: UserBlockViolation[]) {
    super(violations.join(", "))
    this.name = "UserBlockRefusedError"
  }
}

async function withRefusal<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send()
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 400) {
      // ky has already read the body into `error.data`.
      const refusal = userBlockRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new UserBlockRefusedError(refusal.data.violations)
    }
    throw error
  }
}

/**
 * #239: a block changes both people's details and the events, groups and
 * requests it undid, so every user detail is refreshed.
 */
function useUserBlockMutation<TInput, TResult>(send: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TInput) => withRefusal(() => send(input)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...adminKeys.all(), "user"] }),
  })
}

export const useBlockUser = (userId: string) =>
  useUserBlockMutation(async (input: { otherUserId: string; reason: string }) =>
    adminUserBlocksSchema.parse(
      await adminApi.post(`users/${userId}/blocks`, { json: input }).json(),
    ),
  )

export const useUnblockUser = (userId: string) =>
  useUserBlockMutation(async (otherUserId: string) => {
    await adminApi.delete(`users/${userId}/blocks/${otherUserId}`)
  })

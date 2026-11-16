import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HTTPError } from "ky"

import { adminKeys } from "@/features/admin/api/adminKeys"
import {
  administratorRefusalSchema,
  administratorSchema,
  type Administrator,
  type AdministratorViolation,
} from "@/features/admin/api/adminSchemas"
import { adminApi } from "@/features/admin/lib/admin-api"

/** The server refused for a reason the page can explain. */
export class AdministratorRefusedError extends Error {
  constructor(readonly violations: AdministratorViolation[]) {
    super(violations.join(", "))
    this.name = "AdministratorRefusedError"
  }
}

// A 400 or 409 with `violations` becomes an AdministratorRefusedError.
async function withRefusal(send: () => Promise<unknown>): Promise<Administrator> {
  try {
    return administratorSchema.parse(await send())
  } catch (error) {
    if (error instanceof HTTPError && [400, 409].includes(error.response.status)) {
      // ky has already read the body into `error.data`.
      const refusal = administratorRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new AdministratorRefusedError(refusal.data.violations)
    }
    throw error
  }
}

/** Every change refreshes the list: statuses and who did what move together. */
function useAdministratorMutation<TInput>(send: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TInput) => withRefusal(() => send(input)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminKeys.administrators() }),
  })
}

export const useInviteAdministrator = () =>
  useAdministratorMutation((input: { email: string; name: string }) =>
    adminApi.post("administrators", { json: input }).json(),
  )

export const useResendInvitation = () =>
  useAdministratorMutation((id: string) => adminApi.post(`administrators/${id}/invitation`).json())

export const useDeactivateAdministrator = () =>
  useAdministratorMutation((id: string) => adminApi.post(`administrators/${id}/deactivate`).json())

export const useReactivateAdministrator = () =>
  useAdministratorMutation((id: string) => adminApi.post(`administrators/${id}/reactivate`).json())

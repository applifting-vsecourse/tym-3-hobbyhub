import { useMutation, useQueryClient } from "@tanstack/react-query"

import { adminKeys } from "@/features/admin/api/adminKeys"
import { adminAuthClient } from "@/features/admin/lib/admin-auth-client"

type AdminSignInInput = { email: string; password: string; rememberMe?: boolean }

/** Carries BetterAuth's code and status, so the page can say what went wrong. */
export class AdminSignInError extends Error {
  readonly code: string | undefined
  readonly status: number | undefined

  constructor(code: string | undefined, status: number | undefined, message?: string) {
    super(message ?? code ?? "Admin sign-in failed")
    this.code = code
    this.status = status
  }
}

export function useAdminSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password, rememberMe = false }: AdminSignInInput) => {
      const { error } = await adminAuthClient.signIn.email({ email, password, rememberMe })
      if (error) throw new AdminSignInError(error.code, error.status, error.message)
    },
    onSuccess: async () => {
      // The next page's loader reads the session; refetch it even when inactive.
      await queryClient.invalidateQueries({ queryKey: adminKeys.session(), refetchType: "all" })
    },
  })
}

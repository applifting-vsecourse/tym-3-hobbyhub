import { useMutation, useQueryClient } from "@tanstack/react-query"

import { adminKeys } from "@/features/admin/api/adminKeys"
import { adminAuthClient } from "@/features/admin/lib/admin-auth-client"

type AdminSignInInput = { email: string; password: string; rememberMe?: boolean }

/**
 * Carries BetterAuth's code and status, so the page can say what went wrong
 * (sign-in, setting a password, asking for a link).
 */
export class AdminAuthError extends Error {
  readonly code: string | undefined
  readonly status: number | undefined

  constructor(code: string | undefined, status: number | undefined, message?: string) {
    super(message ?? code ?? "Admin auth failed")
    this.code = code
    this.status = status
  }
}

export function useAdminSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password, rememberMe = false }: AdminSignInInput) => {
      const { error } = await adminAuthClient.signIn.email({ email, password, rememberMe })
      if (error) throw new AdminAuthError(error.code, error.status, error.message)
    },
    onSuccess: async () => {
      // The next page's loader reads the session; refetch it even when inactive.
      await queryClient.invalidateQueries({ queryKey: adminKeys.session(), refetchType: "all" })
    },
  })
}

/** "Zapomenuté heslo": the answer is the same whether the address is known. */
export function useAdminRequestPasswordReset() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await adminAuthClient.requestPasswordReset({ email })
      if (error) throw new AdminAuthError(error.code, error.status, error.message)
    },
  })
}

/** The link from the invitation or the reset e-mail sets the password. */
export function useAdminResetPassword() {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const { error } = await adminAuthClient.resetPassword({ token, newPassword })
      if (error) throw new AdminAuthError(error.code, error.status, error.message)
    },
  })
}

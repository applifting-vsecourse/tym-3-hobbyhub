import { useMutation } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"
import { AuthError } from "@/features/auth/lib/authErrors"

/** F-03.5: sets the new password; the token from the e-mail ties it to one account. */
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const { error } = await authClient.resetPassword({ token, newPassword })
      if (error) throw new AuthError(error.code, error.message, error.status)
    },
  })
}

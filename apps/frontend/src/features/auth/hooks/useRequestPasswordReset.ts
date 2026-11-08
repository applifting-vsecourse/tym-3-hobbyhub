import { useMutation } from "@tanstack/react-query"

import { authClient } from "@/features/auth/lib/auth-client"
import { AuthError } from "@/features/auth/lib/authErrors"

/**
 * F-03.5: asks for the e-mail with the link to set a new password. The server
 * answers the same for an address with an account and one without.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      // No redirectTo: the e-mail link is built by the server from its own config.
      const { error } = await authClient.requestPasswordReset({ email })
      if (error) throw new AuthError(error.code, error.message, error.status)
    },
  })
}

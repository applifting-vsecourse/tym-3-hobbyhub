import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { AuthError } from "@/features/auth/lib/authErrors"
import { currentPath, verifyEmailCallbackUrl } from "@/features/auth/lib/verifyEmailUrl"

/**
 * F-03.2: sends the verification e-mail again; its link leads to `next`, by
 * default back to this page.
 */
export function useResendVerification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, next }: { email: string; next?: string }) => {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: verifyEmailCallbackUrl(next ?? currentPath()),
      })
      if (error) throw new AuthError(error.code, error.message, error.status)
    },
    onError: async (error) => {
      // Verified in another tab or on another device: the session is stale.
      if (error instanceof AuthError && error.code === "EMAIL_ALREADY_VERIFIED") {
        await queryClient.invalidateQueries({ queryKey: authKeys.session(), refetchType: "all" })
      }
    },
  })
}

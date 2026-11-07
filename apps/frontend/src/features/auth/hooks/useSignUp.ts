import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { AuthError } from "@/features/auth/lib/authErrors"
import { redirectTarget } from "@/features/auth/lib/redirect"
import { verifyEmailCallbackUrl } from "@/features/auth/lib/verifyEmailUrl"

export type SignUpInput = {
  name: string
  email: string
  password: string
  gender: "MALE" | "FEMALE"
  /** Only the year, never the full date (#174). */
  birthYear: number
  /** The user confirmed being 18 or older. */
  adulthoodConfirmed: boolean
  termsAccepted: boolean
}

type SignUpVariables = SignUpInput & {
  /** The page the visitor wanted, as the sign-up page got it in `from`. */
  from?: string
}

export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ from, ...input }: SignUpVariables) => {
      // BetterAuth handles the whole flow (and signs the user in by default).
      // Gender, year of birth and the consents are read by the backend's registration
      // hook; the typed sign-up body does not list them, hence the variable.
      const body = {
        ...input,
        // Where the link in the verification e-mail ends. Without it BetterAuth
        // redirects to `/` on the backend, which has no page. It leads back
        // to the page the visitor wanted, if there was one (F-03.2).
        callbackURL: verifyEmailCallbackUrl(from ? redirectTarget(from, ROUTES.home) : undefined),
      }
      const { error } = await authClient.signUp.email(body)
      if (error) throw new AuthError(error.code, error.message, error.status)
    },
    onSuccess: async () => {
      // Nothing on the sign-up page uses the session; see useSignIn.
      await queryClient.invalidateQueries({
        queryKey: authKeys.session(),
        refetchType: "all",
      })
    },
  })
}

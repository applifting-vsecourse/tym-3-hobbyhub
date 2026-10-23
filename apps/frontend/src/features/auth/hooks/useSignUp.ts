import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ROUTES } from "@/app/routes"
import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { AuthError } from "@/features/auth/lib/authErrors"

export type SignUpInput = {
  name: string
  email: string
  password: string
  gender: "MALE" | "FEMALE"
  /** "YYYY-MM-DD" */
  birthDate: string
  termsAccepted: boolean
}

export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      // BetterAuth handles the whole flow (and signs the user in by default).
      // Gender, birth date and consent are read by the backend's registration
      // hook; the typed sign-up body does not list them, hence the variable.
      const body = {
        ...input,
        // Where the link in the verification e-mail ends. Without it BetterAuth
        // redirects to `/` on the backend, which has no page. A public page,
        // because the link is often opened where the user is not signed in.
        callbackURL: `${window.location.origin}${ROUTES.events}`,
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

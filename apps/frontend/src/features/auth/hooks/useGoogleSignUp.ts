import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { languageOf, toAccountLanguage } from "@/i18n/resources"
import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"
import { AuthError } from "@/features/auth/lib/authErrors"

// What the backend's sign-up endpoints answer with when they refuse.
type ErrorBody = { code?: string; message?: string }

/**
 * Whose Google account is waiting to sign up. `token` is what the backend put
 * on the return address after Google; it is short-lived, so a failure means
 * the sign-up has to begin again.
 */
export function useGooglePending(token: string | undefined) {
  return useQuery({
    queryKey: ["google-signup", "pending", token],
    queryFn: async () => {
      const { data, error } = await authClient.$fetch<{ email: string }, ErrorBody>(
        "/google-signup/pending",
        {
          method: "GET",
          query: { token },
        },
      )
      if (error) throw new AuthError(error.code, error.message, error.status)
      return data
    },
    enabled: token !== undefined,
    retry: false,
    staleTime: Infinity,
  })
}

export type GoogleSignUpInput = {
  token: string
  username: string
  gender: "MALE" | "FEMALE"
  /** Only the year, never the full date (#174). */
  birthYear: number
  adulthoodConfirmed: boolean
  termsAccepted: boolean
}

/** Finishes a sign-up that began with Google: no second trip to Google. */
export function useCompleteGoogleSignUp() {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()

  return useMutation({
    mutationFn: async (input: GoogleSignUpInput) => {
      const { error } = await authClient.$fetch<unknown, ErrorBody>("/google-signup/complete", {
        method: "POST",
        body: {
          ...input,
          // #262: the account speaks the language its sign-up was filled in.
          preferredLanguage: toAccountLanguage(languageOf(i18n.resolvedLanguage)),
        },
      })
      if (error) throw new AuthError(error.code, error.message, error.status)
    },
    onSuccess: async () => {
      // The backend signed the new account in; see useSignIn for why all.
      await queryClient.invalidateQueries({
        queryKey: authKeys.session(),
        refetchType: "all",
      })
    },
  })
}

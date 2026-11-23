import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { GoogleButton } from "@/features/auth/components/GoogleButton"
import { SignUpForm, type SignUpFormValues } from "@/features/auth/components/SignUpForm"
import { useCompleteGoogleSignUp, useGooglePending } from "@/features/auth/hooks/useGoogleSignUp"
import { useSignUp } from "@/features/auth/hooks/useSignUp"
import { authErrorMessage, googleErrorMessage } from "@/features/auth/lib/authErrors"
import { redirectTarget } from "@/features/auth/lib/redirect"

// `from` is the page to return to after signing up, e.g. the event the
// visitor wanted to join (F-03.1). Sign-in passes it on, and back.
const signUpSearchParamsSchema = z.object({
  from: z.string().optional(),
  // Set by BetterAuth when the round trip to Google fails.
  error: z.string().optional(),
  // The token the backend issued when a Google account that has no account here
  // yet signed in: with it the sign-up finishes without another trip to Google.
  googleToken: z.string().optional(),
})

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  validateSearch: signUpSearchParamsSchema,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: ROUTES.home })
  },
})

function SignUpPage() {
  const { from, error: googleError, googleToken } = Route.useSearch()
  const googlePending = useGooglePending(googleToken)
  // A token that no longer opens (too old) leaves the ordinary sign-up.
  const isGoogleSignUp = googleToken !== undefined && !googlePending.isError
  const googleEmail = googlePending.data?.email
  const completeGoogle = useCompleteGoogleSignUp()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const signUp = useSignUp()
  const [error, setError] = useState<unknown>(null)

  const handleSubmit = async (values: SignUpFormValues) => {
    setError(null)
    try {
      if (isGoogleSignUp) {
        // E-mail and password are not asked: the account is the Google one.
        await completeGoogle.mutateAsync({
          token: googleToken,
          username: values.username,
          gender: values.gender,
          birthYear: values.birthYear,
          adulthoodConfirmed: values.adulthoodConfirmed,
          termsAccepted: values.termsAccepted,
        })
      } else {
        // The repeated password is only for the form; the server never sees it.
        const { confirmPassword: _confirmPassword, ...input } = values
        await signUp.mutateAsync({ ...input, from })
      }
      // F-04.8: a new account goes through the onboarding first, which then
      // returns to the page the visitor came from.
      await navigate({ to: ROUTES.onboarding, search: { from } })
    } catch (error) {
      setError(error)
    }
  }

  return (
    <>
      <Seo title={t(isGoogleSignUp ? "auth.signUp.googleTitle" : "auth.signUp.title")} />
      <AuthLayout
        title={t(isGoogleSignUp ? "auth.signUp.googleTitle" : "auth.signUp.title")}
        description={
          isGoogleSignUp
            ? googleEmail
              ? t("auth.signUp.googleDescription", { email: googleEmail })
              : t("auth.signUp.googleDescriptionNoEmail")
            : t(from ? "auth.signUp.descriptionReturn" : "auth.signUp.description")
        }
        backTo={redirectTarget(from, ROUTES.home)}
        // Someone who has just come from Google has no use for "I already
        // have an account".
        footer={
          isGoogleSignUp ? null : (
            <Button
              asChild
              variant="link"
            >
              <Link
                to={ROUTES.login}
                search={{ from }}
              >
                {t("auth.signUp.signInLink")}
              </Link>
            </Button>
          )
        }
      >
        <SignUpForm
          isLoading={signUp.isPending || completeGoogle.isPending}
          errorMessage={
            error
              ? authErrorMessage(t, error, "signUpFailed")
              : googlePending.isError
                ? t("auth.errors.googleExpired")
                : googleError
                  ? googleErrorMessage(t, googleError)
                  : null
          }
          isGoogleOnly={isGoogleSignUp}
          renderGoogle={(getRegistration) => (
            <GoogleButton
              from={from}
              getRegistration={getRegistration}
            />
          )}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}

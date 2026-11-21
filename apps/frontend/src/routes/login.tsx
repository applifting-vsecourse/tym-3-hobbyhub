import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { GoogleButton, OrDivider } from "@/features/auth/components/GoogleButton"
import { SignInForm, type SignInFormValues } from "@/features/auth/components/SignInForm"
import { useSignIn } from "@/features/auth/hooks/useSignIn"
import { authErrorMessage, googleErrorMessage } from "@/features/auth/lib/authErrors"
import { redirectTargetOutside } from "@/features/auth/lib/redirect"
import { onboardingQueryOptions } from "@/features/onboarding/api/onboardingQueryOptions"

const loginSearchParamsSchema = z.object({
  from: z.string().optional(),
  // Set by BetterAuth when the round trip to Google fails.
  error: z.string().optional(),
})

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: loginSearchParamsSchema,
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context, deps }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    // Coming back from Google lands here already signed in: on to where the
    // visitor was going, or to an onboarding that was not ended (F-04.8).
    const onboarding = await context.queryClient
      .fetchQuery({ ...onboardingQueryOptions(), staleTime: 0 })
      .catch(() => null)
    if (onboarding?.completedAt === null) {
      throw redirect({ to: ROUTES.onboarding, search: { from: deps.from } })
    }
    throw redirect({ to: redirectTargetOutside(deps.from, ROUTES.home, ROUTES.login) })
  },
})

function LoginPage() {
  const { from, error: googleError } = Route.useSearch()
  const redirectTo = redirectTargetOutside(from, ROUTES.home, ROUTES.login)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const signIn = useSignIn()
  const [error, setError] = useState<unknown>(null)

  const handleSubmit = async (values: SignInFormValues) => {
    setError(null)
    try {
      await signIn.mutateAsync(values)
      // F-04.8: an onboarding that was not ended resumes at the first open step.
      // Failing to find out must not stop the sign-in.
      const onboarding = await queryClient
        .fetchQuery({ ...onboardingQueryOptions(), staleTime: 0 })
        .catch(() => null)
      if (onboarding?.completedAt === null) {
        await navigate({ to: ROUTES.onboarding, search: { from } })
        return
      }
      await navigate({ to: redirectTo })
    } catch (error) {
      setError(error)
    }
  }

  return (
    <>
      <Seo title={t("auth.signIn.title")} />
      <AuthLayout
        title={t("auth.signIn.title")}
        description={t("auth.signIn.description")}
        footer={
          <>
            {t("auth.signIn.noAccount")}{" "}
            <Link
              to={ROUTES.signup}
              search={{ from }}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t("auth.signIn.signUpLink")}
            </Link>
          </>
        }
      >
        <div className="mb-6 space-y-3">
          <GoogleButton from={from} />
          <OrDivider />
        </div>
        <SignInForm
          isLoading={signIn.isPending}
          errorMessage={
            error
              ? authErrorMessage(t, error, "signInFailed")
              : googleError
                ? googleErrorMessage(t, googleError)
                : null
          }
          onSubmit={handleSubmit}
        />
        <p className="mt-4 text-center typo-small">
          <Link
            to={ROUTES.forgotPassword}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t("auth.signIn.forgotPassword")}
          </Link>
        </p>
      </AuthLayout>
    </>
  )
}

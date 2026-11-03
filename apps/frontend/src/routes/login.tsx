import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignInForm, type SignInFormValues } from "@/features/auth/components/SignInForm"
import { useSignIn } from "@/features/auth/hooks/useSignIn"
import { authErrorMessage } from "@/features/auth/lib/authErrors"
import { redirectTarget } from "@/features/auth/lib/redirect"
import { onboardingQueryOptions } from "@/features/onboarding/api/onboardingQueryOptions"

const loginSearchParamsSchema = z.object({
  from: z.string().optional(),
})

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: loginSearchParamsSchema,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: ROUTES.home })
  },
})

function LoginPage() {
  const { from } = Route.useSearch()
  const redirectTo = redirectTarget(from, ROUTES.home)
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
        <SignInForm
          isLoading={signIn.isPending}
          errorMessage={error ? authErrorMessage(t, error, "signInFailed") : null}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}

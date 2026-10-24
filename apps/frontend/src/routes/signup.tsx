import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignUpForm, type SignUpFormValues } from "@/features/auth/components/SignUpForm"
import { useSignUp } from "@/features/auth/hooks/useSignUp"
import { authErrorMessage } from "@/features/auth/lib/authErrors"
import { redirectTarget } from "@/features/auth/lib/redirect"

// `from` is the page to return to after signing up, e.g. the event the
// visitor wanted to join (F-03.1). Sign-in passes it on, and back.
const signUpSearchParamsSchema = z.object({
  from: z.string().optional(),
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
  const { from } = Route.useSearch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const signUp = useSignUp()
  const [error, setError] = useState<unknown>(null)

  const handleSubmit = async (values: SignUpFormValues) => {
    setError(null)
    try {
      await signUp.mutateAsync(values)
      // F-04.8: a new account goes through the onboarding first, which then
      // returns to the page the visitor came from.
      await navigate({ to: ROUTES.onboarding, search: { from } })
    } catch (error) {
      setError(error)
    }
  }

  return (
    <>
      <Seo title={t("auth.signUp.title")} />
      <AuthLayout
        title={t("auth.signUp.title")}
        description={t(from ? "auth.signUp.descriptionReturn" : "auth.signUp.description")}
        backTo={redirectTarget(from, ROUTES.home)}
        footer={
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
        }
      >
        <SignUpForm
          isLoading={signUp.isPending}
          errorMessage={error ? authErrorMessage(t, error, "signUpFailed") : null}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}

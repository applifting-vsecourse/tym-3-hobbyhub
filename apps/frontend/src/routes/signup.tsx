import { useState } from "react"
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { SignUpForm } from "@/features/auth/components/SignUpForm"
import { useSignUp } from "@/features/auth/hooks/useSignUp"
import { authErrorMessage } from "@/features/auth/lib/authErrors"

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (!session) return
    throw redirect({ to: ROUTES.quacks })
  },
})

function SignUpPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const signUp = useSignUp()
  const [error, setError] = useState<unknown>(null)

  const handleSubmit = async (values: {
    email: string
    name: string
    username: string
    password: string
  }) => {
    setError(null)
    try {
      await signUp.mutateAsync({
        email: values.email,
        password: values.password,
        name: values.name,
        username: values.username,
      })
      await navigate({ to: ROUTES.quacks })
    } catch (error) {
      setError(error)
    }
  }

  return (
    <>
      <Seo title={t("auth.signUp.title")} />
      <AuthLayout
        title={t("auth.signUp.title")}
        description={t("auth.signUp.description")}
        footer={
          <>
            {t("auth.signUp.haveAccount")}{" "}
            <Link
              to={ROUTES.login}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t("auth.signUp.signInLink")}
            </Link>
          </>
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

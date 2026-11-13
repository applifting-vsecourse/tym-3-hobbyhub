import { useState } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"

import { adminSessionQueryOptions } from "@/features/admin/api/adminSessionQueryOptions"
import { AdminSignInError, useAdminSignIn } from "@/features/admin/hooks/useAdminSignIn"
import { SignInForm, type SignInFormValues } from "@/features/auth/components/SignInForm"

// ADR-0010, #238: the administrators' own sign-in, not the users' one.
export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(adminSessionQueryOptions())
    if (session) throw redirect({ to: ROUTES.adminUsers })
  },
})

const signInErrorMessage = (t: TFunction, error: unknown) => {
  if (!(error instanceof AdminSignInError)) return t("auth.errors.signInFailed")
  // The rate limiter answers without a code.
  if (error.status === 429) return t("auth.errors.tooManyRequests")
  if (error.code === "INVALID_EMAIL_OR_PASSWORD") return t("auth.errors.invalidCredentials")
  return t("auth.errors.signInFailed")
}

function AdminLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signIn = useAdminSignIn()
  const [error, setError] = useState<unknown>(null)

  const handleSubmit = async (values: SignInFormValues) => {
    setError(null)
    try {
      await signIn.mutateAsync(values)
      await navigate({ to: ROUTES.adminUsers })
    } catch (error) {
      setError(error)
    }
  }

  return (
    <>
      <Seo title={t("admin.signIn.title")} />
      <AuthLayout
        title={t("admin.signIn.title")}
        description={t("admin.signIn.description")}
        footer={t("admin.signIn.footer")}
      >
        <SignInForm
          isLoading={signIn.isPending}
          errorMessage={error ? signInErrorMessage(t, error) : null}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}

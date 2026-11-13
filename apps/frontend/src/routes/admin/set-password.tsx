import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { adminKeys } from "@/features/admin/api/adminKeys"
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/features/admin/api/adminSchemas"
import { AdminAuthError, useAdminResetPassword } from "@/features/admin/hooks/useAdminSignIn"
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm"

// ADR-0021: the link in the invitation (72 hours) and in "Zapomenuté heslo"
// (1 hour) ends here with `token`. Both work once; the server checks it.
const setPasswordSearchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute("/admin/set-password")({
  component: AdminSetPasswordPage,
  validateSearch: setPasswordSearchSchema,
})

const errorMessageOf = (t: TFunction, error: unknown): string => {
  if (error instanceof AdminAuthError) {
    if (error.status === 429) return t("auth.errors.tooManyRequests")
    if (error.code === "PASSWORD_TOO_SHORT") {
      return t("auth.validation.passwordMinLength", { minimum: ADMIN_PASSWORD_MIN_LENGTH })
    }
  }
  return t("auth.errors.resetPasswordFailed")
}

function AdminSetPasswordPage() {
  const { t } = useTranslation()
  const { token: urlToken } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // Kept in state and taken out of the address, so it does not stay in the
  // history or travel in a Referer header.
  const [token] = useState(urlToken)
  useEffect(() => {
    if (urlToken) void navigate({ to: ROUTES.adminSetPassword, search: {}, replace: true })
  }, [urlToken, navigate])
  const reset = useAdminResetPassword()
  const [error, setError] = useState<unknown>(null)

  const isTokenRejected = error instanceof AdminAuthError && error.code === "INVALID_TOKEN"

  const handleSubmit = async ({ password }: { password: string }) => {
    if (!token) return
    setError(null)
    try {
      await reset.mutateAsync({ token, newPassword: password })
      // Every session of the account is gone with the old password.
      await queryClient.invalidateQueries({ queryKey: adminKeys.session(), refetchType: "all" })
    } catch (error) {
      setError(error)
    }
  }

  if (reset.isSuccess) {
    return (
      <>
        <Seo title={t("admin.setPassword.title")} />
        <AuthLayout
          title={t("admin.setPassword.title")}
          description={t("admin.setPassword.done")}
          footer={null}
        >
          <Button
            asChild
            size="lg"
            className="w-full"
          >
            <Link to={ROUTES.adminLogin}>{t("admin.setPassword.signIn")}</Link>
          </Button>
        </AuthLayout>
      </>
    )
  }

  if (!token || isTokenRejected) {
    return (
      <>
        <Seo title={t("auth.resetPassword.invalidTitle")} />
        <AuthLayout
          title={t("auth.resetPassword.invalidTitle")}
          description={t("admin.setPassword.invalidDescription")}
          footer={null}
        >
          <Button
            asChild
            size="lg"
            className="w-full"
          >
            <Link to={ROUTES.adminForgotPassword}>{t("auth.resetPassword.requestNew")}</Link>
          </Button>
        </AuthLayout>
      </>
    )
  }

  return (
    <>
      <Seo title={t("admin.setPassword.title")} />
      <AuthLayout
        title={t("admin.setPassword.title")}
        description={t("admin.setPassword.description", { minimum: ADMIN_PASSWORD_MIN_LENGTH })}
        footer={null}
      >
        <ResetPasswordForm
          minLength={ADMIN_PASSWORD_MIN_LENGTH}
          isLoading={reset.isPending}
          errorMessage={error ? errorMessageOf(t, error) : null}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}

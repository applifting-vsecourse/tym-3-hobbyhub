import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { AdminAuthError, useAdminRequestPasswordReset } from "@/features/admin/hooks/useAdminSignIn"
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm"

// ADR-0021, "Zapomenuté heslo" of the administration. The answer is the same
// whether the address belongs to an administrator, a deactivated one or
// nobody, so the page cannot be used to find out.
export const Route = createFileRoute("/admin/forgot-password")({
  component: AdminForgotPasswordPage,
})

function AdminForgotPasswordPage() {
  const { t } = useTranslation()
  const request = useAdminRequestPasswordReset()
  const [error, setError] = useState<unknown>(null)

  const handleSubmit = async (values: { email: string }) => {
    setError(null)
    try {
      await request.mutateAsync(values)
    } catch (error) {
      setError(error)
    }
  }

  const errorMessage = error
    ? error instanceof AdminAuthError && error.status === 429
      ? t("auth.errors.tooManyRequests")
      : t("auth.forgotPassword.failed")
    : null

  return (
    <>
      <Seo title={t("admin.forgotPassword.title")} />
      <AuthLayout
        title={t("admin.forgotPassword.title")}
        description={t("admin.forgotPassword.description")}
        backTo={ROUTES.adminLogin}
        footer={
          <Link
            to={ROUTES.adminLogin}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t("auth.forgotPassword.backToSignIn")}
          </Link>
        }
      >
        {request.isSuccess ? (
          <Alert role="status">
            <AlertDescription>{t("admin.forgotPassword.sent")}</AlertDescription>
          </Alert>
        ) : (
          <ForgotPasswordForm
            isLoading={request.isPending}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
          />
        )}
      </AuthLayout>
    </>
  )
}

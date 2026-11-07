import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm"
import { useRequestPasswordReset } from "@/features/auth/hooks/useRequestPasswordReset"
import { AuthError } from "@/features/auth/lib/authErrors"

// F-03.5. Asks for the e-mail with the link. The answer is the same whether
// the address has an account or not, so the page cannot be used to find out.
export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { t } = useTranslation()
  const request = useRequestPasswordReset()
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
    ? error instanceof AuthError && error.status === 429
      ? t("auth.errors.tooManyRequests")
      : t("auth.forgotPassword.failed")
    : null

  return (
    <>
      <Seo title={t("auth.forgotPassword.title")} />
      <AuthLayout
        title={t("auth.forgotPassword.title")}
        description={t("auth.forgotPassword.description")}
        backTo={ROUTES.login}
        footer={
          <Link
            to={ROUTES.login}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t("auth.forgotPassword.backToSignIn")}
          </Link>
        }
      >
        {request.isSuccess ? (
          <Alert role="status">
            <AlertDescription>{t("auth.forgotPassword.sent")}</AlertDescription>
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

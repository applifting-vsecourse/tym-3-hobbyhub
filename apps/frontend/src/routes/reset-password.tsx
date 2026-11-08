import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/AuthLayout"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { authKeys } from "@/lib/auth-keys"

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm"
import { useResetPassword } from "@/features/auth/hooks/useResetPassword"
import { AuthError, authErrorMessage } from "@/features/auth/lib/authErrors"

// F-03.5. The link in the reset e-mail ends here with `token`. The token is
// valid for an hour, once, and belongs to one account; the server checks it
// when the password is sent. BetterAuth adds `error` when it redirects here itself.
const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: resetPasswordSearchSchema,
})

function ResetPasswordPage() {
  const { t } = useTranslation()
  const { token: urlToken, error: linkError } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // Kept in state and taken out of the address, so it does not stay in the
  // history or travel in a Referer header.
  const [token] = useState(urlToken)
  useEffect(() => {
    if (urlToken) void navigate({ to: ROUTES.resetPassword, search: {}, replace: true })
  }, [urlToken, navigate])
  const reset = useResetPassword()
  const [error, setError] = useState<unknown>(null)

  const isTokenRejected = error instanceof AuthError && error.code === "INVALID_TOKEN"
  const isLinkBroken = !token || Boolean(linkError) || isTokenRejected

  const handleSubmit = async ({ password }: { password: string }) => {
    if (!token) return
    setError(null)
    try {
      await reset.mutateAsync({ token, newPassword: password })
      // Every session of the account is gone; the cached one must not send
      // the sign-in page straight back to the app.
      await queryClient.invalidateQueries({ queryKey: authKeys.session(), refetchType: "all" })
    } catch (error) {
      setError(error)
    }
  }

  if (reset.isSuccess) {
    return (
      <>
        <Seo title={t("auth.resetPassword.title")} />
        <AuthLayout
          title={t("auth.resetPassword.title")}
          description={t("auth.resetPassword.done")}
          footer={null}
        >
          <Button
            asChild
            size="lg"
            className="w-full"
          >
            <Link to={ROUTES.login}>{t("auth.resetPassword.signIn")}</Link>
          </Button>
        </AuthLayout>
      </>
    )
  }

  if (isLinkBroken) {
    return (
      <>
        <Seo title={t("auth.resetPassword.invalidTitle")} />
        <AuthLayout
          title={t("auth.resetPassword.invalidTitle")}
          description={t("auth.resetPassword.invalidDescription")}
          footer={null}
        >
          <Button
            asChild
            size="lg"
            className="w-full"
          >
            <Link to={ROUTES.forgotPassword}>{t("auth.resetPassword.requestNew")}</Link>
          </Button>
        </AuthLayout>
      </>
    )
  }

  return (
    <>
      <Seo title={t("auth.resetPassword.title")} />
      <AuthLayout
        title={t("auth.resetPassword.title")}
        description={t("auth.resetPassword.description")}
        footer={null}
      >
        <ResetPasswordForm
          isLoading={reset.isPending}
          errorMessage={error ? authErrorMessage(t, error, "resetPasswordFailed") : null}
          onSubmit={handleSubmit}
        />
      </AuthLayout>
    </>
  )
}

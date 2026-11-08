import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { useRequestPasswordReset } from "@/features/auth/hooks/useRequestPasswordReset"
import { useSession } from "@/features/auth/hooks/useSession"
import { AuthError } from "@/features/auth/lib/authErrors"

/**
 * F-03.5: a signed-in person changes the password the same way as one who
 * forgot it: through the link in an e-mail, no old password asked.
 */
export function ChangePassword() {
  const { t } = useTranslation()
  const { user } = useSession()
  const request = useRequestPasswordReset()
  const headingId = useId()

  if (!user) return null

  const message = request.isSuccess
    ? t("profile.changePassword.sent")
    : request.isError
      ? request.error instanceof AuthError && request.error.status === 429
        ? t("auth.errors.tooManyRequests")
        : t("profile.changePassword.failed")
      : null

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t border-border pt-6"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="typo-h3 text-foreground"
        >
          {t("profile.changePassword.title")}
        </h2>
        <p className="typo-small text-muted-foreground">
          {t("profile.changePassword.description")}
        </p>
      </div>
      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          variant="outline"
          className="max-md:h-11"
          disabled={request.isPending}
          onClick={() => request.mutate({ email: user.email })}
        >
          {t("profile.changePassword.action")}
        </Button>
        {message ? (
          <p
            role="status"
            className="typo-small text-muted-foreground"
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  )
}

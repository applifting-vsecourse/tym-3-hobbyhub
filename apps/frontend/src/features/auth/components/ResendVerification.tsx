import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { useResendVerification } from "@/features/auth/hooks/useResendVerification"
import { useSession } from "@/features/auth/hooks/useSession"
import { AuthError } from "@/features/auth/lib/authErrors"
import { resendSecondsLeft } from "@/features/auth/lib/resendCooldown"

type ResendVerificationProps = {
  /** Where the new link leads on; this page when omitted. */
  next?: string
}

/**
 * "Send the verification e-mail again" with the wait the server enforces
 * shown as a countdown, so the person is not left clicking a button that
 * answers "too many attempts". The wait is kept per address outside this
 * component, so closing and reopening the sheet around it does not reset it.
 */
export function ResendVerification({ next }: ResendVerificationProps) {
  const { t } = useTranslation()
  const { user } = useSession()
  const resend = useResendVerification()
  const [, setTick] = useState(0)
  const secondsLeft = user ? resendSecondsLeft(user.email) : 0

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = window.setTimeout(() => setTick((tick) => tick + 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  if (!user) return null

  const handleClick = () => {
    resend.mutate({ email: user.email, next })
  }

  const isWaiting = secondsLeft > 0
  const message = resend.isSuccess
    ? t("auth.verifyEmail.sent")
    : resend.isError
      ? resend.error instanceof AuthError && resend.error.status === 429
        ? t("auth.errors.tooManyRequests")
        : t("auth.verifyEmail.resendFailed")
      : null

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={resend.isPending || isWaiting}
        onClick={handleClick}
      >
        {isWaiting
          ? t("auth.verifyEmail.resendIn", { seconds: secondsLeft })
          : t("auth.verifyEmail.resend")}
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
  )
}

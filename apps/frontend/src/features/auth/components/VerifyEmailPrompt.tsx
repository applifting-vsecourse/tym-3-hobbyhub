import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { ResendVerification } from "@/features/auth/components/ResendVerification"
import { useSession } from "@/features/auth/hooks/useSession"

/**
 * F-03.2: on the person's own profile, until their e-mail is verified, says
 * what they are missing and offers to send the link again. The one place they
 * can come back to verifying without first being refused something. Says
 * nothing while the session loads or once the e-mail is verified.
 */
export function VerifyEmailPrompt() {
  const { t } = useTranslation()
  const { user } = useSession()

  if (!user || user.emailVerified) return null

  return (
    <Alert>
      <AlertTitle>{t("auth.verifyEmail.prompt.title")}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{t("auth.verifyEmail.prompt.description", { email: user.email })}</span>
        <ResendVerification />
      </AlertDescription>
    </Alert>
  )
}

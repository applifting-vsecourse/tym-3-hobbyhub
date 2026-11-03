import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { ResendVerification } from "@/features/auth/components/ResendVerification"
import { useSession } from "@/features/auth/hooks/useSession"

/** F-03.2: shown to a signed-in person whose e-mail is not verified yet, where it blocks them. */
export function VerifyEmailNotice() {
  const { t } = useTranslation()
  const { user } = useSession()

  if (!user || user.emailVerified) return null

  return (
    <Alert>
      <AlertTitle>{t("auth.verifyEmail.noticeTitle")}</AlertTitle>
      <AlertDescription>
        <p>{t("auth.verifyEmail.noticeDescription", { email: user.email })}</p>
        <ResendVerification />
      </AlertDescription>
    </Alert>
  )
}

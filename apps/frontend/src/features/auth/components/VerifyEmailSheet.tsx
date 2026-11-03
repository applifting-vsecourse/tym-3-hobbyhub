import { useTranslation } from "react-i18next"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"

import { ResendVerification } from "@/features/auth/components/ResendVerification"

type VerifyEmailSheetProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * F-03.2: what a person with an unverified e-mail gets when they try something
 * that needs it (publishing an event, founding a group): why it did not go
 * through, and the way to send the e-mail again.
 */
export function VerifyEmailSheet({ isOpen, onOpenChange }: VerifyEmailSheetProps) {
  const { t } = useTranslation()

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t("auth.verifyEmail.sheet.title")}
      description={t("auth.verifyEmail.sheet.description")}
      hasCloseButton
    >
      <div className="flex justify-start pb-2">
        <ResendVerification />
      </div>
    </ResponsiveSheet>
  )
}

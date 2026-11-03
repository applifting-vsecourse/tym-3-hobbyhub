import { useId, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import type { MyRequestState } from "@/features/participation-request/api/participationRequestSchemas"
import { refusalOf } from "@/features/participation-request/lib/joinPanel"

type JoinRequestActionProps = {
  /** "Požádat o účast" when the organizer approves, "Obsadit místo" when the seat is taken at once. */
  label: string
  /** Undefined while loading, or when it failed: then the server decides on send. */
  state: MyRequestState | undefined
  isLoading: boolean
  /** Opens the request sheet, which the page owns. */
  onRequest: () => void
  /** F-03.2: shown in the sheet a person with an unverified e-mail gets instead of the request. */
  verifyEmailAction?: ReactNode
}

/** The free seat's button for a signed-in person: ask to join, or why not. */
export function JoinRequestAction({
  label,
  state,
  isLoading,
  onRequest,
  verifyEmailAction,
}: JoinRequestActionProps) {
  const { t } = useTranslation()
  const reasonId = useId()
  const [isVerifySheetOpen, setIsVerifySheetOpen] = useState(false)
  const refusal = state ? refusalOf(state.violations) : null

  if (isLoading) {
    return <Button disabled>{label}</Button>
  }

  // F-03.2: the button stays active; the click explains what is missing.
  if (refusal === "EMAIL_NOT_VERIFIED") {
    return (
      <>
        <Button onClick={() => setIsVerifySheetOpen(true)}>{label}</Button>
        <ResponsiveSheet
          isOpen={isVerifySheetOpen}
          onOpenChange={setIsVerifySheetOpen}
          title={t("participationRequests.verifyEmail.title")}
          description={t("participationRequests.verifyEmail.description")}
          hasCloseButton
        >
          <div className="flex justify-start pb-2">{verifyEmailAction}</div>
        </ResponsiveSheet>
      </>
    )
  }

  if (refusal) {
    return (
      <>
        <Button
          disabled
          aria-describedby={reasonId}
        >
          {label}
        </Button>
        <p
          id={reasonId}
          className="text-center typo-small text-accent-foreground"
        >
          {t(`participationRequests.refused.${refusal}`)}
        </p>
      </>
    )
  }

  return <Button onClick={onRequest}>{label}</Button>
}

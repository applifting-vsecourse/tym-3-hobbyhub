import { useTranslation } from "react-i18next"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

type ChangeWarningDialogProps = {
  readonly isOpen: boolean
  readonly approvedCount: number
  readonly isSubmitting: boolean
  readonly onConfirm: () => void
  readonly onBack: () => void
}

/**
 * Time or place of an event with approved participants is about to change.
 * Nobody tells them yet (F-09.3), so the organizer has to know.
 */
export function ChangeWarningDialog({
  isOpen,
  approvedCount,
  isSubmitting,
  onConfirm,
  onBack,
}: ChangeWarningDialogProps) {
  const { t } = useTranslation()

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={(isOpen) => {
        // Escape while the save runs would give up on a request already sent.
        if (!isOpen && !isSubmitting) onBack()
      }}
      title={t("events.changeWarning.title")}
      description={t("events.changeWarning.description", { count: approvedCount })}
      footer={
        <>
          <Button
            type="button"
            className="w-full"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {t("events.changeWarning.confirm")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isSubmitting}
            onClick={onBack}
          >
            {t("events.changeWarning.back")}
          </Button>
        </>
      }
    >
      {null}
    </ResponsiveSheet>
  )
}

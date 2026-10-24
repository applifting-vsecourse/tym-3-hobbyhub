import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        // Escape while the save runs would give up on a request already sent.
        if (!isOpen && !isSubmitting) onBack()
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("events.changeWarning.title")}</DialogTitle>
          <DialogDescription>
            {t("events.changeWarning.description", { count: approvedCount })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
          >
            {t("events.changeWarning.back")}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {t("events.changeWarning.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

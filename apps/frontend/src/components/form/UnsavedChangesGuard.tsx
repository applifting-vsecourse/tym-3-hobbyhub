import { useCallback } from "react"
import { useBlocker } from "@tanstack/react-router"
import { useFormState } from "react-hook-form"
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

type UnsavedChangesGuardProps = {
  /** Replaces the generic "you have unsaved changes" wording. */
  readonly message?: string
}

/**
 * Asks before the page is left while the surrounding form has changes that
 * were not submitted: navigation inside the app gets this dialog, closing or
 * reloading the tab gets the browser's own prompt. Reads the form from
 * context, so it needs no wiring; `AppForm` renders it by default.
 */
export function UnsavedChangesGuard({ message }: UnsavedChangesGuardProps) {
  const { t } = useTranslation()
  const { isDirty, isSubmitSuccessful } = useFormState()
  // A submit that resolved means the data is safe; a thrown one keeps guarding.
  const hasUnsavedChanges = isDirty && !isSubmitSuccessful

  // Stable while the answer is the same: the router re-registers the blocker
  // whenever this function changes.
  const shouldBlockFn = useCallback(() => hasUnsavedChanges, [hasUnsavedChanges])
  const blocker = useBlocker({
    shouldBlockFn,
    enableBeforeUnload: hasUnsavedChanges,
    withResolver: true,
  })

  return (
    <Dialog
      open={blocker.status === "blocked"}
      // Escape and a click outside mean "stay".
      onOpenChange={(isOpen) => {
        if (!isOpen) blocker.reset?.()
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("common.unsavedChanges.title")}</DialogTitle>
          <DialogDescription>{message ?? t("common.unsavedChanges.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={blocker.proceed}
          >
            {t("common.unsavedChanges.leave")}
          </Button>
          <Button
            type="button"
            onClick={blocker.reset}
          >
            {t("common.unsavedChanges.stay")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

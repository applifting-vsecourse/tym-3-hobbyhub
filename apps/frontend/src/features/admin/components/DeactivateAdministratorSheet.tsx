import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import { AdministratorRefusedError } from "@/features/admin/api/administratorMutations"
import type { Administrator } from "@/features/admin/api/adminSchemas"

type DeactivateAdministratorSheetProps = {
  /** Who to remove; null while the sheet is closed. */
  administrator: Administrator | null
  isPending: boolean
  error: unknown
  onClose: () => void
  onConfirm: (administrator: Administrator) => void
}

/** #237: removing takes the access away at once, so it asks first. */
export function DeactivateAdministratorSheet({
  administrator,
  isPending,
  error,
  onClose,
  onConfirm,
}: DeactivateAdministratorSheetProps) {
  const { t } = useTranslation()
  const values = { name: administrator?.name ?? "" }
  const isLastActive =
    error instanceof AdministratorRefusedError && error.violations.includes("LAST_ACTIVE")

  return (
    <ResponsiveSheet
      isOpen={administrator !== null}
      onOpenChange={(isOpening) => {
        if (!isOpening) onClose()
      }}
      title={t("admin.deactivate.title", values)}
      hasCloseButton
      footer={
        administrator ? (
          <>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => onConfirm(administrator)}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("admin.deactivate.confirm")}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
            >
              {t("admin.deactivate.cancel")}
            </Button>
          </>
        ) : null
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        <p className="typo-body text-foreground">{t("admin.deactivate.text", values)}</p>
        {error ? (
          <p
            role="alert"
            className="typo-small text-destructive"
          >
            {isLastActive ? t("admin.deactivate.lastActive") : t("admin.deactivate.failed")}
          </p>
        ) : null}
      </div>
    </ResponsiveSheet>
  )
}

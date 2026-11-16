import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import { moderationErrorOf } from "@/features/admin/components/HideEventSheet"

type RestoreEventSheetProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  isPending: boolean
  error: unknown
  onConfirm: () => void
}

/** #239: bringing an event back tells its people, so it asks first. */
export function RestoreEventSheet({
  isOpen,
  onOpenChange,
  title,
  isPending,
  error,
  onConfirm,
}: RestoreEventSheetProps) {
  const { t } = useTranslation()
  const errorMessage = moderationErrorOf(t, error)

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t("admin.moderation.restoreTitle", { title })}
      hasCloseButton
      footer={
        <>
          <Button
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("admin.moderation.restoreSubmit")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("admin.moderation.cancel")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        <p className="typo-body text-foreground">{t("admin.moderation.restoreText")}</p>
        {errorMessage ? (
          <p
            role="alert"
            className="typo-small text-destructive"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    </ResponsiveSheet>
  )
}

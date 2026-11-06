import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import type { GroupMember } from "@/features/group/api/membershipRequestSchemas"
import type { MemberAction } from "@/features/group/lib/memberActions"

export type PendingMemberAction = { action: MemberAction; member: GroupMember }

type MemberActionSheetProps = {
  /** The action to confirm; null when the sheet is closed. */
  pending: PendingMemberAction | null
  groupName: string
  isPending: boolean
  isError: boolean
  onClose: () => void
  onConfirm: (pending: PendingMemberAction) => void
}

/** Confirms one member action (F-07.3b) before it is sent. */
export function MemberActionSheet({
  pending,
  groupName,
  isPending,
  isError,
  onClose,
  onConfirm,
}: MemberActionSheetProps) {
  const { t } = useTranslation()
  const action = pending?.action
  const values = { name: pending?.member.name ?? "", group: groupName }

  return (
    <ResponsiveSheet
      isOpen={pending !== null}
      onOpenChange={(isOpening) => {
        if (!isOpening) onClose()
      }}
      title={action ? t(`groups.manage.actions.${action}.title`, values) : ""}
      hasCloseButton
      footer={
        pending ? (
          <>
            <Button
              // Removing someone is the one action here that takes something away.
              variant={pending.action === "remove" ? "destructive" : "default"}
              disabled={isPending}
              onClick={() => onConfirm(pending)}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t(`groups.manage.actions.${pending.action}.confirm`)}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
            >
              {t("groups.manage.actions.cancel")}
            </Button>
          </>
        ) : null
      }
    >
      {action ? (
        <div className="flex flex-col gap-4 pb-1">
          <p className="typo-body text-foreground">
            {t(`groups.manage.actions.${action}.text`, values)}
          </p>
          {isError ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("groups.manage.actions.failed")}
            </p>
          ) : null}
        </div>
      ) : null}
    </ResponsiveSheet>
  )
}

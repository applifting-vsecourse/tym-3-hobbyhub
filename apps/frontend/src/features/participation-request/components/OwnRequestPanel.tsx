import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { useWithdrawRequest } from "@/features/participation-request/hooks/useWithdrawRequest"
import type { OwnSeatView } from "@/features/participation-request/lib/joinPanel"

type WithdrawRequestButtonProps = {
  eventId: string
  onChange?: () => Promise<unknown>
}

function WithdrawRequestButton({ eventId, onChange }: WithdrawRequestButtonProps) {
  const { t } = useTranslation()
  const withdraw = useWithdrawRequest(onChange)

  const confirm = () =>
    withdraw.mutate(eventId, {
      onSuccess: () => toast.success(t("participationRequests.pending.withdrawn")),
      onError: () => toast.error(t("participationRequests.pending.withdrawFailed")),
    })

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          disabled={withdraw.isPending}
        >
          {t("participationRequests.pending.withdraw")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("participationRequests.pending.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("participationRequests.pending.confirmText")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("participationRequests.pending.confirmKeep")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={confirm}
          >
            {t("participationRequests.pending.confirmWithdraw")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type OwnRequestPanelProps = {
  eventId: string
  view: OwnSeatView
  /** Refreshes the page around the request once it is withdrawn. */
  onChange?: () => Promise<unknown>
}

const BADGES = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const

/** The signed-in person's own place in the event, shown instead of the free seat. */
export function OwnRequestPanel({ eventId, view, onChange }: OwnRequestPanelProps) {
  const { t } = useTranslation()

  if (view === "organizer") {
    return (
      <p className="typo-body text-signal-soft">
        {t("participationRequests.refused.IS_ORGANIZER")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-accent p-4 text-accent-foreground">
      <StatusBadge
        status={BADGES[view]}
        className="self-start"
      />
      <p className="typo-small">{t(`participationRequests.${view}.description`)}</p>
      {view === "pending" ? (
        <div className="*:w-full">
          <WithdrawRequestButton
            eventId={eventId}
            onChange={onChange}
          />
        </div>
      ) : null}
    </div>
  )
}

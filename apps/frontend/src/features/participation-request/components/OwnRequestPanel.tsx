import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"

import type { ApprovalMode } from "@/features/participation-request/api/participationRequestSchemas"
import type { OwnSeatView } from "@/features/participation-request/lib/joinPanel"

type OwnRequestPanelProps = {
  /** The organizer's own event shows `OrganizerPanel` instead. */
  view: Exclude<OwnSeatView, "organizer">
  /** With automatic approval nobody approved the seat; it was simply taken. */
  approvalMode: ApprovalMode
  /** Opens the confirmation to withdraw a pending request, which the page owns. */
  onWithdraw: () => void
  /**
   * Opens the dialog to cancel the seat (F-06.4), which the page owns. Absent
   * once the seat can no longer be cancelled: the event started or ended.
   */
  onCancel?: () => void
  /** The button to ask again, for someone who cancelled their seat. */
  rejoinAction?: ReactNode
  /** What the organizer wrote with the approval or the rejection (#153). */
  decisionMessage?: string | null
}

const BADGES = {
  pending: "pending",
  approved: "approved",
  cancelled: "cancelled",
  rejected: "rejected",
} as const

/** The signed-in person's own place in the event, shown instead of the free seat. */
export function OwnRequestPanel({
  view,
  approvalMode,
  onWithdraw,
  onCancel,
  rejoinAction,
  decisionMessage,
}: OwnRequestPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-accent p-4 text-accent-foreground">
      <StatusBadge
        status={BADGES[view]}
        className="self-start"
      />
      <p className="typo-small">
        {view === "approved" && approvalMode === "AUTOMATIC"
          ? t("participationRequests.approved.descriptionAutomatic")
          : t(`participationRequests.${view}.description`)}
      </p>
      {decisionMessage ? (
        <dl className="flex flex-col gap-1">
          <dt className="typo-label">{t("participationRequests.decisionMessage")}</dt>
          <dd className="typo-body break-words whitespace-pre-line">{decisionMessage}</dd>
        </dl>
      ) : null}
      {view === "pending" ? (
        <Button
          variant="outline"
          onClick={onWithdraw}
        >
          {t("participationRequests.pending.withdraw")}
        </Button>
      ) : null}
      {view === "approved" && onCancel ? (
        <>
          <p className="typo-small">{t("participationRequests.cancelRule")}</p>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {t("participationRequests.approved.cancel")}
          </Button>
        </>
      ) : null}
      {view === "cancelled" ? rejoinAction : null}
    </div>
  )
}

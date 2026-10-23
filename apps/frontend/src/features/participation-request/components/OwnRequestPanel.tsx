import { useTranslation } from "react-i18next"

import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"

import type { OwnSeatView } from "@/features/participation-request/lib/joinPanel"

type OwnRequestPanelProps = {
  view: OwnSeatView
  /** Opens the confirmation to withdraw a pending request, which the page owns. */
  onWithdraw: () => void
}

const BADGES = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const

/** The signed-in person's own place in the event, shown instead of the free seat. */
export function OwnRequestPanel({ view, onWithdraw }: OwnRequestPanelProps) {
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
        <Button
          variant="outline"
          onClick={onWithdraw}
        >
          {t("participationRequests.pending.withdraw")}
        </Button>
      ) : null}
    </div>
  )
}

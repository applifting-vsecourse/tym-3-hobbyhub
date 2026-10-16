import { useTranslation } from "react-i18next"

import { ActivityAvatar, type AvatarKind } from "@/components/hobbyhub/ActivityAvatar"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type JoinRequestCardProps = {
  name: string
  avatar: AvatarKind
  hasVerifiedEmail?: boolean
  /** Activity and level, e.g. "Florbal, pokročilí". */
  activityLine: string
  /** History, e.g. "Registrován v březnu, 6 akcí". */
  historyLine: string
  message?: string
  /** What approval changes, e.g. "Po schválení bude 8/10, chybět budou 2." */
  outcome: string
  onApprove: () => void
  onReject: () => void
  isPending?: boolean
  className?: string
}

/** Žádost o účast — what the organiser sees before approving a request. */
export function JoinRequestCard({
  name,
  avatar,
  hasVerifiedEmail = false,
  activityLine,
  historyLine,
  message,
  outcome,
  onApprove,
  onReject,
  isPending = false,
  className,
}: JoinRequestCardProps) {
  const { t } = useTranslation()

  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-4 rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <ActivityAvatar
          avatar={avatar}
          size="xl"
        />
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="typo-title text-foreground">{name}</h3>
            {hasVerifiedEmail ? (
              <StatusBadge status="approved">{t("hobbyhub.joinRequest.verified")}</StatusBadge>
            ) : null}
          </div>
          <p className="typo-small text-muted-foreground">{activityLine}</p>
          <p className="typo-small text-muted-foreground">{historyLine}</p>
        </div>
      </div>

      {message ? (
        <p className="w-full rounded-md bg-muted p-3 typo-label text-secondary-foreground">
          {message}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isPending}
        >
          {t("hobbyhub.joinRequest.approve")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={isPending}
        >
          {t("hobbyhub.joinRequest.reject")}
        </Button>
      </div>

      <p className="typo-small text-muted-foreground">{outcome}</p>
    </article>
  )
}

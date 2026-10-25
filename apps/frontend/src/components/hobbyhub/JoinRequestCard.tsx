import { useId } from "react"
import { useTranslation } from "react-i18next"

import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type JoinRequestApplicantProps = {
  name: string
  /** Photo URL; initials stand in without one. */
  photo?: string | null
  hasVerifiedEmail?: boolean
  bio?: string | null
}

/**
 * Who asks: all the organiser sees of them. The request form shows the
 * applicant the same block, so they know what the organiser will see.
 */
export function JoinRequestApplicant({
  name,
  photo,
  hasVerifiedEmail = false,
  bio,
}: JoinRequestApplicantProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-start gap-3">
      <PersonAvatar
        name={name}
        photo={photo}
        size="xl"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="typo-title break-words text-foreground">{name}</h3>
          {hasVerifiedEmail ? (
            <StatusBadge status="approved">{t("hobbyhub.joinRequest.verified")}</StatusBadge>
          ) : null}
        </div>
        {bio ? (
          <p className="typo-small break-words whitespace-pre-line text-muted-foreground">{bio}</p>
        ) : null}
      </div>
    </div>
  )
}

type JoinRequestCardProps = JoinRequestApplicantProps & {
  message?: string | null
  /**
   * What approval changes, e.g. "Po schválení bude minimum splněno (8 z 8).",
   * or why it cannot happen, e.g. a full event.
   */
  outcome?: string
  /** Approval is not possible now (a full event); the outcome says why. */
  isApproveDisabled?: boolean
  /** Without both handlers the card only shows the request (an event that has started). */
  onApprove?: () => void
  onReject?: () => void
  isPending?: boolean
  className?: string
}

/** Žádost o účast — what the organiser sees before approving a request. */
export function JoinRequestCard({
  message,
  outcome,
  isApproveDisabled = false,
  onApprove,
  onReject,
  isPending = false,
  className,
  ...applicant
}: JoinRequestCardProps) {
  const { t } = useTranslation()
  const outcomeId = useId()

  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-4 rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <JoinRequestApplicant {...applicant} />

      {message ? (
        <p className="w-full rounded-md bg-muted p-3 typo-label break-words whitespace-pre-line text-secondary-foreground">
          {message}
        </p>
      ) : null}

      {onApprove && onReject ? (
        // Outline, not filled: a list of requests would otherwise show a
        // primary button per card (DESIGN.md: one primary action per screen).
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onApprove}
            disabled={isPending || isApproveDisabled}
            aria-describedby={outcome ? outcomeId : undefined}
          >
            {t("hobbyhub.joinRequest.approve")}
          </Button>
          <Button
            variant="ghost"
            onClick={onReject}
            disabled={isPending}
          >
            {t("hobbyhub.joinRequest.reject")}
          </Button>
        </div>
      ) : null}

      {outcome ? (
        <p
          id={outcomeId}
          className="typo-small text-muted-foreground"
        >
          {outcome}
        </p>
      ) : null}
    </article>
  )
}

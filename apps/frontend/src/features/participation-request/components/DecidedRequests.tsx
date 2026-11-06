import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { JoinRequestCard } from "@/components/hobbyhub/JoinRequestCard"
import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { decidedRequestsQueryOptions } from "@/features/participation-request/api/decidedRequestsQueryOptions"
import {
  DECIDED_STATUSES,
  type DecidedStatus,
} from "@/features/participation-request/api/participationRequestSchemas"
import type { ManagedEventOverview } from "@/features/participation-request/lib/requestDecision"

type DecidedRequestsProps = {
  event: ManagedEventOverview
}

/**
 * Účastníci (F-05.6): who has a seat, who was rejected and who withdrew, each
 * its own list with the latest change first.
 */
export function DecidedRequests({ event }: DecidedRequestsProps) {
  return (
    <div className="flex flex-col gap-8">
      {DECIDED_STATUSES.map((status) => (
        <DecidedSection
          key={status}
          eventId={event.id}
          status={status}
          externalOccupied={status === "APPROVED" ? event.externalOccupied : 0}
        />
      ))}
    </div>
  )
}

type DecidedSectionProps = {
  eventId: string
  status: DecidedStatus
  /** Seats outside the app, said under the approved people. */
  externalOccupied: number
}

function DecidedSection({ eventId, status, externalOccupied }: DecidedSectionProps) {
  const { t, i18n } = useTranslation()
  const query = useInfiniteQuery(decidedRequestsQueryOptions(eventId, status))
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0
  const headingId = `decided-${status.toLowerCase()}-heading`
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" })

  const loadError = (onRetry: () => void) => (
    <Alert variant="destructive">
      <AlertTitle>{t(`participationRequests.manage.decided.${status}.loadError`)}</AlertTitle>
      <AlertDescription className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          {t("participationRequests.manage.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  )

  let content
  if (query.isPending) {
    content = (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t(`participationRequests.manage.decided.${status}.loading`)}
        />
      </div>
    )
  } else if (query.isError && items.length === 0) {
    content = loadError(() => void query.refetch())
  } else if (items.length === 0) {
    content = (
      <p className="typo-body text-muted-foreground">
        {t(`participationRequests.manage.decided.${status}.empty`)}
      </p>
    )
  } else {
    content = (
      <>
        <ul className="flex flex-col gap-3">
          {items.map((request) => (
            <li key={request.id}>
              <JoinRequestCard
                name={request.applicant.name}
                profileUserId={request.userId}
                photo={request.applicant.image}
                hasVerifiedEmail={request.applicant.hasVerifiedEmail}
                bio={request.applicant.bio}
                message={request.message}
                note={t(`participationRequests.manage.decided.${status}.since`, {
                  date: date.format(request.changedAt),
                })}
              />
            </li>
          ))}
        </ul>
        {query.isFetchNextPageError ? (
          // A later page failed: keep what is loaded and retry just that page.
          loadError(() => void query.fetchNextPage())
        ) : query.hasNextPage ? (
          <Button
            variant="outline"
            className="self-center"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {t(`participationRequests.manage.decided.${status}.more`, {
              count: total - items.length,
            })}
          </Button>
        ) : null}
      </>
    )
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="flex items-baseline gap-2 typo-h3 text-foreground"
        >
          {t(`participationRequests.manage.decided.${status}.title`)}
          {query.data ? <span className="typo-body text-muted-foreground">{total}</span> : null}
        </h2>
        {externalOccupied > 0 ? (
          <p className="typo-small text-muted-foreground">
            {t("participationRequests.manage.decided.APPROVED.external", {
              count: externalOccupied,
            })}
          </p>
        ) : null}
      </div>
      {content}
    </section>
  )
}

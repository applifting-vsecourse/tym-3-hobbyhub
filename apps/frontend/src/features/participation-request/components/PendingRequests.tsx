import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { JoinRequestCard } from "@/components/hobbyhub/JoinRequestCard"
import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { DecisionRefusedError } from "@/features/participation-request/api/decideRequest"
import type { PendingRequest } from "@/features/participation-request/api/participationRequestSchemas"
import { pendingRequestsQueryOptions } from "@/features/participation-request/api/pendingRequestsQueryOptions"
import { RejectRequestSheet } from "@/features/participation-request/components/RejectRequestSheet"
import {
  useApproveRequest,
  useRejectRequest,
} from "@/features/participation-request/hooks/useDecideRequest"
import {
  approvalOutcome,
  decisionLockOf,
  decisionRefusalMessage,
  isFull,
  type ManagedEvent,
} from "@/features/participation-request/lib/requestDecision"

type PendingRequestsProps = {
  event: ManagedEvent
  /** Refreshes the event around the list after a decision, e.g. its seat counts. */
  onChange?: () => Promise<unknown>
  /** Injectable so "has started" is stable in tests. */
  now?: Date
}

/**
 * Čekající žádosti (F-05.7): the organizer approves or rejects them until the
 * event starts. Oldest first, a page at a time.
 */
export function PendingRequests({ event, onChange, now = new Date() }: PendingRequestsProps) {
  const { t } = useTranslation()
  const requestsQuery = useInfiniteQuery(pendingRequestsQueryOptions(event.id))
  const approve = useApproveRequest(event.id, onChange)
  const reject = useRejectRequest(event.id, onChange)
  const [rejecting, setRejecting] = useState<PendingRequest | null>(null)

  const lock = decisionLockOf(event, now)
  const capacity = { taken: event.taken, min: event.min, max: event.max }
  const outcome = approvalOutcome(t, capacity)
  const refusalMessage = (error: unknown, fallback: string) =>
    error instanceof DecisionRefusedError ? decisionRefusalMessage(t, error.violations) : fallback

  const handleApprove = (request: PendingRequest) =>
    approve.mutate(request.id, {
      onSuccess: () => toast.success(t("participationRequests.manage.approved")),
      onError: (error) =>
        toast.error(refusalMessage(error, t("participationRequests.manage.approveFailed"))),
    })

  // Throws on failure, so the form keeps the typed reason; the sheet shows why.
  const handleReject = async (reason: string | undefined) => {
    if (!rejecting) return
    await reject.mutateAsync({ requestId: rejecting.id, reason })
    setRejecting(null)
    toast.success(t("participationRequests.manage.rejected"))
  }

  const closeReject = () => {
    setRejecting(null)
    reject.reset()
  }

  const items = requestsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const total = requestsQuery.data?.pages[0]?.total ?? 0

  let content
  if (requestsQuery.isPending) {
    content = (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t("participationRequests.manage.loading")}
        />
      </div>
    )
  } else if (requestsQuery.isError && items.length === 0) {
    content = (
      <Alert variant="destructive">
        <AlertTitle>{t("participationRequests.manage.loadError")}</AlertTitle>
        <AlertDescription className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void requestsQuery.refetch()}
          >
            {t("participationRequests.manage.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  } else if (items.length === 0) {
    content = (
      <p className="typo-body text-muted-foreground">
        {t(
          event.approvalMode === "AUTOMATIC"
            ? "participationRequests.manage.emptyAutomatic"
            : "participationRequests.manage.empty",
        )}
      </p>
    )
  } else {
    content = (
      <>
        {lock ? (
          <p className="typo-body text-foreground">
            {t(`participationRequests.manage.locked.${lock}`)}
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {items.map((request) => (
            <li key={request.id}>
              <JoinRequestCard
                name={request.applicant.name}
                photo={request.applicant.image}
                hasVerifiedEmail={request.applicant.hasVerifiedEmail}
                bio={request.applicant.bio}
                message={request.message}
                {...(lock
                  ? {}
                  : {
                      outcome,
                      isApproveDisabled: isFull(capacity),
                      isPending: approve.isPending && approve.variables === request.id,
                      onApprove: () => handleApprove(request),
                      onReject: () => setRejecting(request),
                    })}
              />
            </li>
          ))}
        </ul>
        {requestsQuery.isFetchNextPageError ? (
          // A later page failed: keep what is loaded and retry just that page.
          <Alert variant="destructive">
            <AlertTitle>{t("participationRequests.manage.loadError")}</AlertTitle>
            <AlertDescription className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void requestsQuery.fetchNextPage()}
              >
                {t("participationRequests.manage.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : requestsQuery.hasNextPage ? (
          <Button
            variant="outline"
            className="self-center"
            disabled={requestsQuery.isFetchingNextPage}
            onClick={() => void requestsQuery.fetchNextPage()}
          >
            {t("participationRequests.manage.more", { count: total - items.length })}
          </Button>
        ) : null}
      </>
    )
  }

  return (
    <section
      aria-labelledby="requests-heading"
      className="flex flex-col gap-4"
    >
      <h2
        id="requests-heading"
        className="flex items-baseline gap-2 typo-h3 text-foreground"
      >
        {t("participationRequests.manage.requests")}
        {requestsQuery.data ? (
          <span className="typo-body text-muted-foreground">{total}</span>
        ) : null}
      </h2>
      {content}
      <RejectRequestSheet
        request={rejecting}
        isPending={reject.isPending}
        errorMessage={
          reject.isError
            ? refusalMessage(reject.error, t("participationRequests.manage.rejectFailed"))
            : null
        }
        onConfirm={handleReject}
        onClose={closeReject}
      />
    </section>
  )
}

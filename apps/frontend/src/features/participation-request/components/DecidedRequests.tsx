import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { JoinRequestCard } from "@/components/hobbyhub/JoinRequestCard"

import { decidedRequestsQueryOptions } from "@/features/participation-request/api/decidedRequestsQueryOptions"
import {
  DECIDED_STATUSES,
  type DecidedStatus,
} from "@/features/participation-request/api/participationRequestSchemas"
import { PagedSection } from "@/features/participation-request/components/PagedSection"

/**
 * Zamítnuté a stažené žádosti (F-05.6): the requests that ended without a
 * seat, under the waiting ones on the requests tab, the latest change first.
 */
export function DecidedRequests({ eventId }: { eventId: string }) {
  return (
    <div className="flex flex-col gap-8">
      {DECIDED_STATUSES.map((status) => (
        <DecidedSection
          key={status}
          eventId={eventId}
          status={status}
        />
      ))}
    </div>
  )
}

function DecidedSection({ eventId, status }: { eventId: string; status: DecidedStatus }) {
  const { t, i18n } = useTranslation()
  const query = useInfiniteQuery(decidedRequestsQueryOptions(eventId, status))
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" })

  return (
    <PagedSection
      headingId={`decided-${status.toLowerCase()}-heading`}
      query={query}
      texts={{
        title: t(`participationRequests.manage.decided.${status}.title`),
        loading: t(`participationRequests.manage.decided.${status}.loading`),
        loadError: t(`participationRequests.manage.decided.${status}.loadError`),
        empty: t(`participationRequests.manage.decided.${status}.empty`),
        more: (count) => t(`participationRequests.manage.decided.${status}.more`, { count }),
      }}
      getKey={(request) => request.id}
      renderItem={(request) => (
        <JoinRequestCard
          name={request.applicant.name}
          photo={request.applicant.image}
          hasVerifiedEmail={request.applicant.hasVerifiedEmail}
          bio={request.applicant.bio}
          message={request.message}
          note={t(`participationRequests.manage.decided.${status}.since`, {
            date: date.format(request.changedAt),
          })}
        />
      )}
    />
  )
}

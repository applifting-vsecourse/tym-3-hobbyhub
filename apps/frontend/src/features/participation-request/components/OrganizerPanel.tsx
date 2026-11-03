import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { pendingRequestsQueryOptions } from "@/features/participation-request/api/pendingRequestsQueryOptions"

/**
 * The organizer's place on their own event: the way to its requests (F-05.7).
 * The count comes from the first page of the list, so the page it links to
 * opens from the cache.
 */
export function OrganizerPanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const requestsQuery = useInfiniteQuery(pendingRequestsQueryOptions(eventId))
  const total = requestsQuery.data?.pages[0]?.total

  return (
    <div className="flex flex-col gap-3">
      <p className="typo-body text-signal-soft">
        {t("participationRequests.refused.IS_ORGANIZER")}
      </p>
      <Button asChild>
        <Link
          to="/events/$eventId/participants"
          params={{ eventId }}
          search={{ tab: "requests" }}
        >
          {t("participationRequests.organizer.manage")}
        </Link>
      </Button>
      {total !== undefined ? (
        <p className="text-center typo-small text-signal-soft">
          {t("participationRequests.organizer.pendingCount", { count: total })}
        </p>
      ) : null}
    </div>
  )
}

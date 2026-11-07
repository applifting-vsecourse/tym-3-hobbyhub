import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { eventKeys } from "@/features/event/api/eventKeys"
import { manageEventQueryOptions } from "@/features/event/api/manageEventQueryOptions"
import { eventDay, eventTime } from "@/features/event/lib/eventLabels"
import { pendingRequestsQueryOptions } from "@/features/participation-request/api/pendingRequestsQueryOptions"
import { EventParticipants } from "@/features/participation-request/components/EventParticipants"
import { PARTICIPANTS_TABS } from "@/features/participation-request/components/ParticipantsTabs"

// Which part of the page is open: the requests (F-05.7, F-05.6, the default)
// or the participants, taken and given-back seats (F-05.6, F-06.4).
const participantsSearchSchema = z.object({
  tab: z.enum(PARTICIPANTS_TABS).catch("requests"),
})

export const Route = createFileRoute("/_ProtectedPages/events/$eventId/participants")({
  validateSearch: participantsSearchSchema,
  component: ParticipantsPage,
})

const isNotFound = (error: unknown) => error instanceof HTTPError && error.response.status === 404

function ParticipantsPage() {
  const { eventId } = Route.useParams()
  const { tab } = Route.useSearch()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  // The organizers' view of the event, with the seats outside the app. To
  // anyone else it and the requests answer 404: then the page does not exist
  // for them either.
  const eventQuery = useQuery(manageEventQueryOptions(eventId))
  const requestsQuery = useInfiniteQuery(pendingRequestsQueryOptions(eventId))

  // A decision changes the seats, here, on the detail and in the lists.
  const refreshEvents = () => queryClient.invalidateQueries({ queryKey: eventKeys.all() })

  if (isNotFound(eventQuery.error) || isNotFound(requestsQuery.error)) {
    return (
      <>
        <Seo title={t("participationRequests.manage.title")} />
        <NotFound />
      </>
    )
  }

  return (
    <>
      <Seo title={eventQuery.data?.title ?? t("participationRequests.manage.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-6 md:py-12">
        <BackLink
          to="/events/$eventId"
          params={{ eventId }}
          label={t("participationRequests.manage.back")}
        />
        {eventQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Loader
              variant="seats"
              label={t("events.detail.loading")}
            />
          </div>
        ) : eventQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("events.detail.loadError")}</AlertTitle>
            <AlertDescription className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void eventQuery.refetch()}
              >
                {t("participationRequests.manage.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <EventParticipants
            event={{
              id: eventQuery.data.id,
              title: eventQuery.data.title,
              when: `${eventDay(t, eventQuery.data.startAt, new Date(), i18n.language)} ${eventTime(eventQuery.data.startAt, i18n.language)}`,
              status: eventQuery.data.status,
              startAt: eventQuery.data.startAt,
              endAt: eventQuery.data.endAt,
              approvalMode: eventQuery.data.approvalMode,
              taken: eventQuery.data.occupiedSpots,
              min: eventQuery.data.minParticipants,
              max: eventQuery.data.maxParticipants,
              approved: eventQuery.data.approvedCount,
              externalOccupied: eventQuery.data.externalOccupiedSpots,
              fillState: eventQuery.data.fillState,
            }}
            tab={tab}
            onChange={refreshEvents}
          />
        )}
      </section>
    </>
  )
}

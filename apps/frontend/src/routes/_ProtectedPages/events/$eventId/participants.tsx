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

import { eventDetailQueryOptions } from "@/features/event/api/eventDetailQueryOptions"
import { eventKeys } from "@/features/event/api/eventKeys"
import { eventDay, eventTime } from "@/features/event/lib/eventLabels"
import { pendingRequestsQueryOptions } from "@/features/participation-request/api/pendingRequestsQueryOptions"
import { EventParticipants } from "@/features/participation-request/components/EventParticipants"

// Which part of the page is open. F-05.7 has the requests only; the
// participants (F-05.6) come as a second tab, and links made now keep opening
// the requests.
const participantsSearchSchema = z.object({
  tab: z.enum(["requests"]).catch("requests"),
})

export const Route = createFileRoute("/_ProtectedPages/events/$eventId/participants")({
  validateSearch: participantsSearchSchema,
  component: ParticipantsPage,
})

const isNotFound = (error: unknown) => error instanceof HTTPError && error.response.status === 404

function ParticipantsPage() {
  const { eventId } = Route.useParams()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const eventQuery = useQuery(eventDetailQueryOptions(eventId))
  // To anyone but the organizers the requests answer 404: then the page does
  // not exist for them either.
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
              taken: eventQuery.data.takenCount,
              min: eventQuery.data.minParticipants,
              max: eventQuery.data.maxParticipants,
            }}
            onChange={refreshEvents}
          />
        )}
      </section>
    </>
  )
}

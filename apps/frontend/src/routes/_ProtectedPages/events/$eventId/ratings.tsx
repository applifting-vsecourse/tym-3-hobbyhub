import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"
import { myEventsKeys } from "@/lib/my-events-keys"

import { useSession } from "@/features/auth/hooks/useSession"
import { ratingKeys } from "@/features/rating/api/ratingKeys"
import { eventRatingStateQueryOptions } from "@/features/rating/api/ratingQueryOptions"
import type { RatingInput } from "@/features/rating/api/ratingSchemas"
import { rateOrganizer, rateParticipant } from "@/features/rating/api/submitRating"
import { EventRatingsView } from "@/features/rating/components/EventRatingsView"
import { ratingErrorMessage } from "@/features/rating/lib/ratingRefusal"

// #236: where the calls to rate lead (RATING_PROMPT, HOSTED_RATING_PROMPT), and
// the event's detail and the overview of one's events while rating is on (#234).
export const Route = createFileRoute("/_ProtectedPages/events/$eventId/ratings")({
  component: EventRatingsPage,
})

const isNotFound = (error: unknown) => error instanceof HTTPError && error.response.status === 404

function EventRatingsPage() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation()
  const { user } = useSession()
  // To someone who neither had a seat nor runs the event it answers 404: then
  // the page does not exist for them either.
  const stateQuery = useQuery({
    ...eventRatingStateQueryOptions(eventId, user?.id ?? ""),
    enabled: user !== null,
  })
  const queryClient = useQueryClient()
  // #234: a participant rates the organizer. Saved or refused, what the page
  // and the lists that point here show is out of date: a refusal means the
  // period ended or the rating is there already.
  const refreshRatings = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ratingKeys.all() }),
      queryClient.invalidateQueries({ queryKey: myEventsKeys.all() }),
    ])
  const rateOrganizerMutation = useMutation({
    mutationFn: (input: RatingInput) => rateOrganizer(eventId, input),
    onSettled: refreshRatings,
  })

  if (isNotFound(stateQuery.error)) {
    return (
      <>
        <Seo title={t("rating.page.eyebrow")} />
        <NotFound />
      </>
    )
  }

  return (
    <>
      <Seo title={stateQuery.data?.event.title ?? t("rating.page.eyebrow")} />
      {/* More room under the page on a phone: its one action is the last thing
          on it, and the raised "Přidat akci" of the BottomNav would sit on it. */}
      <section className="mx-auto flex w-full max-w-column-2xl flex-col gap-2 px-page pt-6 pb-16 md:py-12">
        <BackLink
          to="/events/$eventId"
          params={{ eventId }}
          label={t("rating.page.back")}
        />
        {stateQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Loader
              variant="seats"
              label={t("rating.page.loading")}
            />
          </div>
        ) : stateQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("rating.page.loadError")}</AlertTitle>
            <AlertDescription className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="max-md:h-11"
                onClick={() => void stateQuery.refetch()}
              >
                {t("rating.page.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <EventRatingsView
            state={stateQuery.data}
            onRateOrganizer={async (input) => {
              await rateOrganizerMutation.mutateAsync(input)
            }}
            isRatingOrganizer={rateOrganizerMutation.isPending}
            organizerRatingError={
              rateOrganizerMutation.isError
                ? ratingErrorMessage(t, rateOrganizerMutation.error)
                : null
            }
            // #235: the organizer sends several ratings at once, and the list
            // says per participant what went out; the page re-reads after.
            onRateParticipant={async (participantId, input) => {
              await rateParticipant(eventId, participantId, input)
            }}
            onParticipantsRated={refreshRatings}
          />
        )}
      </section>
    </>
  )
}

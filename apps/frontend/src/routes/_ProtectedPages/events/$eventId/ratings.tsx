import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { useSession } from "@/features/auth/hooks/useSession"
import { eventRatingStateQueryOptions } from "@/features/rating/api/ratingQueryOptions"
import { EventRatingsView } from "@/features/rating/components/EventRatingsView"

// #236: where the calls to rate lead (RATING_PROMPT, HOSTED_RATING_PROMPT).
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
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-page py-6 md:py-12">
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
          <EventRatingsView state={stateQuery.data} />
        )}
      </section>
    </>
  )
}

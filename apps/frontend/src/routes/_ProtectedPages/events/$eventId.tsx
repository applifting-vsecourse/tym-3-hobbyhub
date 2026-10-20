import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { Loader } from "@/components/hobbyhub/Loader"
import { SeatMeter } from "@/components/hobbyhub/SeatMeter"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { activityName } from "@/features/activity/activityName"
import { eventQueryOptions } from "@/features/event/api/eventQueryOptions"
import { formatContribution, formatEventRange } from "@/features/event/lib/eventDateTime"

export const Route = createFileRoute("/_ProtectedPages/events/$eventId")({
  component: EventDetailPage,
})

// Minimal detail so a published event has somewhere to land; the public
// detail (F-02.4 #8) and the organizer's overview (F-05.6 #31) build it out.
function EventDetailPage() {
  const { eventId } = Route.useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? "cs"
  const eventQuery = useQuery(eventQueryOptions(eventId))

  if (eventQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader
          variant="seats"
          label={t("events.detail.loading")}
        />
      </div>
    )
  }

  if (eventQuery.isError) {
    const error = eventQuery.error
    if (error instanceof HTTPError && error.response.status === 404) return <NotFound />

    return (
      <section className="mx-auto w-full max-w-2xl px-4 py-6 md:py-12">
        <Alert variant="destructive">
          <AlertTitle>{t("events.detail.loadError")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void eventQuery.refetch()}
            >
              {t("events.form.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  const event = eventQuery.data
  const place = event.location
    ? [
        event.location.placeName,
        `${event.location.street}, ${event.location.postalCode} ${event.location.city}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : null
  const total = Math.max(event.maxParticipants, event.minParticipants)
  const seats =
    event.missingToMinimum > 0
      ? t("events.detail.missing", { count: event.missingToMinimum })
      : event.freeSpots > 0
        ? t("events.detail.free", { count: event.freeSpots })
        : t("events.detail.full")

  return (
    <>
      <Seo title={event.title} />
      <section className="mx-auto w-full max-w-2xl px-4 py-6 md:py-12">
        <BackLink
          to={ROUTES.home}
          label={t("events.back")}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 typo-label text-muted-foreground">
            {isActivityKey(event.activity.icon) ? (
              <ActivityIcon
                activity={event.activity.icon}
                className="size-5"
              />
            ) : null}
            {activityName(t, event.activity)}
          </p>
          {event.status === "PUBLISHED" ? (
            <StatusBadge status="approved">{t("events.detail.published")}</StatusBadge>
          ) : null}
        </div>
        <h1 className="mt-2 typo-h1 text-foreground">{event.title}</h1>
        <p className="mt-2 typo-body text-foreground">
          {formatEventRange(event.startAt, event.endAt, locale)}
        </p>
        <p className="mt-1 typo-body text-muted-foreground">
          {[place, t(`events.venueType.${event.venueType}`)].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <SeatMeter
            taken={event.occupiedSpots}
            min={event.minParticipants}
            max={total}
          />
          <p className="typo-label text-foreground">
            {[t("events.detail.occupied", { taken: event.occupiedSpots, total }), seats].join(", ")}
          </p>
        </div>

        <p className="mt-6 typo-body break-words whitespace-pre-line text-foreground">
          {event.description}
        </p>

        {event.equipment ? (
          <section className="mt-6">
            <h2 className="typo-label-lg text-foreground">{t("events.detail.equipment")}</h2>
            <p className="mt-1 typo-body break-words whitespace-pre-line text-foreground">
              {event.equipment}
            </p>
          </section>
        ) : null}

        {event.contributionAmount !== null ? (
          <section className="mt-6">
            <h2 className="typo-label-lg text-foreground">
              {t("events.detail.contribution", {
                amount: formatContribution(event.contributionAmount, locale),
              })}
            </h2>
            {event.contributionNote ? (
              <p className="mt-1 typo-body text-foreground">{event.contributionNote}</p>
            ) : null}
            <p className="mt-1 typo-small text-muted-foreground">
              {t("events.detail.contributionInfo")}
            </p>
          </section>
        ) : null}
      </section>
    </>
  )
}

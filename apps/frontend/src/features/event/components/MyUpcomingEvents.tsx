import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  myApplicationsQueryOptions,
  myHostedEventsQueryOptions,
} from "@/features/event/api/myEventsQueryOptions"
import { eventWhen } from "@/features/event/lib/eventLabels"

/** How many events the panel lists; the rest is one click away in "Moje akce". */
export const MY_UPCOMING_EVENTS_COUNT = 5

type MyUpcomingEventsProps = {
  userId: string
  className?: string
  /** Injectable so "upcoming" is stable in tests. */
  now?: Date
}

/**
 * The person's own upcoming events beside their profile on a large screen
 * (#224): where they have a seat and what they organize, soonest first. Only
 * on their own profile: the history of someone's events is for them and their
 * friends (visibility matrix), never for anyone who opens their profile.
 */
export function MyUpcomingEvents({ userId, className, now = new Date() }: MyUpcomingEventsProps) {
  const { t, i18n } = useTranslation()
  // The first page of each list holds what is still ahead first, soonest first.
  const applications = useInfiniteQuery(myApplicationsQueryOptions(userId))
  const hosted = useInfiniteQuery(myHostedEventsQueryOptions(userId))

  const isAhead = (endAt: Date) => endAt >= now
  const events = [
    ...(applications.data?.pages[0]?.items ?? [])
      .filter(({ status, event }) => status === "APPROVED" && isAhead(event.endAt))
      .map(({ event }) => ({ event, isHost: false })),
    ...(hosted.data?.pages[0]?.items ?? [])
      .filter((event) => isAhead(event.endAt))
      .map((event) => ({ event, isHost: true })),
  ]
    // An event the person organizes and also has a seat on is listed once, as theirs.
    .filter(
      ({ event, isHost }, _, all) =>
        isHost || !all.some((other) => other.isHost && other.event.id === event.id),
    )
    .sort((a, b) => a.event.startAt.getTime() - b.event.startAt.getTime())
    .slice(0, MY_UPCOMING_EVENTS_COUNT)

  const isPending = applications.isPending || hosted.isPending
  const error = applications.error ?? hosted.error

  return (
    <section
      aria-labelledby="my-upcoming-heading"
      className={cn("flex flex-col gap-3", className)}
    >
      <h2
        id="my-upcoming-heading"
        className="typo-h3 text-foreground"
      >
        {t("profile.upcoming.title")}
      </h2>
      {isPending ? (
        <div className="flex justify-center py-6">
          <Loader
            variant="player"
            label={t("profile.upcoming.loading")}
          />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{t("profile.upcoming.loadError")}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void applications.refetch()
                void hosted.refetch()
              }}
            >
              {t("profile.upcoming.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="typo-body text-muted-foreground">{t("profile.upcoming.empty")}</p>
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link to={ROUTES.events}>{t("profile.upcoming.find")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col">
            {events.map(({ event, isHost }) => (
              <li
                key={event.id}
                className="border-t border-border"
              >
                <Link
                  to="/events/$eventId"
                  params={{ eventId: event.id }}
                  className="-mx-3 flex flex-col gap-0.5 rounded-lg px-3 py-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  <span className="typo-small text-muted-foreground">
                    {[
                      eventWhen(t, event.startAt, now, i18n.language),
                      isHost ? t("profile.upcoming.hosting") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="typo-label-lg break-words text-foreground">{event.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to={ROUTES.myEvents}
            className="self-start rounded-md typo-label text-accent-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {t("profile.upcoming.all")}
          </Link>
        </>
      )}
    </section>
  )
}

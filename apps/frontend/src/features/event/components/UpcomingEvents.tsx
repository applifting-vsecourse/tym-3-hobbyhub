import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { EventCard } from "@/components/hobbyhub/EventCard"
import { Loader } from "@/components/hobbyhub/Loader"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { EventsLoadError } from "@/features/event/components/EventsLoadError"
import { eventMeta, eventWhen } from "@/features/event/lib/eventLabels"

type UpcomingEventsProps = {
  /** Soonest first, already cut to the few the section shows. */
  events: EventListItem[]
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  isLoading?: boolean
  error?: Error | null
  onReload?: () => void
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

/** The soonest events as cards, each opening its detail. */
export function UpcomingEvents({
  events,
  activityLabel,
  isLoading,
  error,
  onReload,
  now = new Date(),
}: UpcomingEventsProps) {
  const { t, i18n } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t("events.list.loading")}
        />
      </div>
    )
  }

  // A failed refetch in the background keeps the data; show the cards, not the error.
  if (error && events.length === 0) {
    return (
      <EventsLoadError
        error={error}
        onRetry={onReload}
      />
    )
  }

  if (events.length === 0) {
    return <p className="typo-body text-muted-foreground">{t("landing.upcoming.empty")}</p>
  }

  return (
    <ul className="grid gap-4 [--seat-delay:900ms] md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="group block h-full rounded-xl transition-transform duration-200 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:hover:-translate-y-0.5"
          >
            <EventCard
              isAnimated
              className="h-full transition-colors duration-200 group-hover:border-primary group-focus-visible:border-primary"
              title={event.title}
              when={eventWhen(t, event.startAt, now, i18n.language)}
              meta={eventMeta(t, event, activityLabel(event.activity))}
              taken={event.takenCount}
              capacity={event.maxParticipants}
              // The title next to it says what the photo shows.
              photo={event.imageUrl ? { src: event.imageUrl, alt: "" } : undefined}
              activity={event.activity.icon}
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}

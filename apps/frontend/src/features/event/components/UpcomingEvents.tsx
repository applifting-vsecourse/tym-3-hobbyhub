import type { ReactNode } from "react"
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
  /** What an empty row says; the landing page's own wording by default. */
  empty?: ReactNode
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
  empty,
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
    return <p className="typo-body text-muted-foreground">{empty ?? t("landing.upcoming.empty")}</p>
  }

  return (
    // A row to scroll sideways (#274): native scrolling snapping to the cards,
    // no arrows, no dots, nothing moves by itself. The cards keep their width on
    // every screen; a larger one shows more of them. The row runs to the edge of
    // the screen, the first card lines up with the page.
    <ul className="-mx-page scroll-px-page flex snap-x snap-mandatory gap-4 overflow-x-auto px-page pb-2 [--seat-delay:900ms]">
      {events.map((event) => (
        <li
          key={event.id}
          className="w-72 shrink-0 snap-start sm:w-80"
        >
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="group block h-full rounded-xl transition-transform duration-200 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring motion-safe:hover:-translate-y-0.5"
          >
            <EventCard
              isAnimated
              className="h-full transition-colors duration-200 group-hover:border-primary group-focus-visible:border-primary"
              title={event.title}
              when={eventWhen(t, event.startAt, now, i18n.language)}
              meta={eventMeta(t, event, activityLabel(event.activity))}
              taken={event.takenCount}
              min={event.minParticipants}
              max={event.maxParticipants}
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

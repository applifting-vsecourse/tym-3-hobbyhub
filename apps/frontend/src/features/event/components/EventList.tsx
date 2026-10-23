import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import SearchIcon from "@/assets/ui-icons/search.svg?react"
import { Loader } from "@/components/hobbyhub/Loader"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { Button } from "@/components/ui/button"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { EventsLoadError } from "@/features/event/components/EventsLoadError"
import { eventDay, eventMeta, eventTime } from "@/features/event/lib/eventLabels"

type EventListProps = {
  events: EventListItem[]
  /** All upcoming events, which can be more than the ones loaded. */
  total: number
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  isLoading?: boolean
  error?: Error | null
  onReload?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  /** Some filter is on, so an empty list means "nothing matches", not "nothing yet". */
  isFiltered?: boolean
  onClearFilters?: () => void
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

export function EventList({
  events,
  total,
  activityLabel,
  isLoading,
  error,
  onReload,
  hasMore,
  isLoadingMore,
  onLoadMore,
  isFiltered,
  onClearFilters,
  now = new Date(),
}: EventListProps) {
  const { t, i18n } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader
          variant="player"
          label={t("events.list.loading")}
        />
      </div>
    )
  }

  // Nothing to show yet: the error is the whole screen.
  if (error && events.length === 0) {
    return (
      <EventsLoadError
        error={error}
        onRetry={onReload}
      />
    )
  }

  if (events.length === 0 && isFiltered) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 py-12 text-center"
      >
        <div
          aria-hidden
          className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <SearchIcon className="size-8" />
        </div>
        <h2 className="typo-h3 text-foreground">{t("events.list.emptyFiltered.title")}</h2>
        <p className="typo-body text-muted-foreground">
          {t("events.list.emptyFiltered.description")}
        </p>
        {onClearFilters ? (
          <Button
            variant="outline"
            className="mt-3 w-full sm:w-auto"
            onClick={onClearFilters}
          >
            {t("events.list.emptyFiltered.clear")}
          </Button>
        ) : null}
      </div>
    )
  }

  if (events.length === 0) {
    return <p className="typo-body text-muted-foreground">{t("events.list.empty")}</p>
  }

  // Events arrive soonest first, so a day's events are next to each other.
  const days: { day: string; events: EventListItem[] }[] = []
  for (const event of events) {
    const day = eventDay(t, event.startAt, now, i18n.language)
    const last = days[days.length - 1]
    if (last?.day === day) last.events.push(event)
    else days.push({ day, events: [event] })
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="typo-small text-muted-foreground">{t("events.list.count", { count: total })}</p>
      {days.map(({ day, events: dayEvents }) => (
        <section
          key={day}
          className="flex flex-col gap-1"
        >
          <h2 className="typo-h3">{day}</h2>
          <ul>
            {dayEvents.map((event) => (
              <li key={event.id}>
                <Link
                  to="/events/$eventId"
                  params={{ eventId: event.id }}
                  className="-mx-3 block rounded-lg px-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <ScheduleRow
                    time={eventTime(event.startAt, i18n.language)}
                    title={event.title}
                    subtitle={eventMeta(t, event, activityLabel(event.activity))}
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
        </section>
      ))}
      {error ? (
        // A later page failed: keep what is loaded and retry just that page.
        <EventsLoadError
          error={error}
          onRetry={onLoadMore}
        />
      ) : hasMore && onLoadMore ? (
        <Button
          variant="outline"
          className="self-center"
          disabled={isLoadingMore}
          onClick={onLoadMore}
        >
          {t("events.list.loadMore")}
        </Button>
      ) : null}
    </div>
  )
}

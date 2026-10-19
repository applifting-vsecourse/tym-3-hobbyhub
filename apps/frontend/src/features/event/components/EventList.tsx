import { Link } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { eventDay, eventMeta, eventTime } from "@/features/event/lib/eventLabels"

type EventListProps = {
  events: EventListItem[]
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  isLoading?: boolean
  error?: Error | null
  onReload?: () => void
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

export function EventList({
  events,
  activityLabel,
  isLoading,
  error,
  onReload,
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("events.list.loadError")}</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error.message}</span>
          {onReload ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onReload}
            >
              <RefreshCw className="size-4" />
              {t("events.list.reload")}
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
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
      <p className="typo-small text-muted-foreground">
        {t("events.list.count", { count: events.length })}
      </p>
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
                  className="block rounded-md transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <ScheduleRow
                    time={eventTime(event.startAt, i18n.language)}
                    title={event.title}
                    subtitle={eventMeta(t, event, activityLabel(event.activity))}
                    taken={event.takenCount}
                    min={event.minParticipants}
                    max={event.maxParticipants}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

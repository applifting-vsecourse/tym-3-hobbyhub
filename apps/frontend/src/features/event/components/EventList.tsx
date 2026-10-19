import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EventCard } from "@/components/hobbyhub/EventCard"
import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { eventMeta, eventWhen } from "@/features/event/lib/eventLabels"

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

  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li key={event.id}>
          <EventCard
            className="h-full"
            title={event.title}
            when={eventWhen(t, event.startAt, now, i18n.language)}
            meta={eventMeta(t, event)}
            activity={{ icon: event.activity.icon, name: activityLabel(event.activity) }}
            taken={event.takenCount}
            capacity={event.maxParticipants}
            min={event.minParticipants}
          />
        </li>
      ))}
    </ul>
  )
}

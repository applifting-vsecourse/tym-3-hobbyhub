import { Link } from "@tanstack/react-router"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EventCard } from "@/components/hobbyhub/EventCard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { eventMeta, eventWhen } from "@/features/event/lib/eventLabels"

type SelectedEventCardProps = {
  event: EventListItem
  /** Display name of the event's activity; the activity feature owns the translation. */
  activityLabel: string
  onClose: () => void
  /** Injectable so "today" is stable in tests. */
  now?: Date
  className?: string
  id?: string
}

/**
 * The event opened from the map, as a card that opens its detail. Beside the
 * list it sits at the top of the list; on a phone it floats over the map.
 */
export function SelectedEventCard({
  event,
  activityLabel,
  onClose,
  now = new Date(),
  className,
  id,
}: SelectedEventCardProps) {
  const { t, i18n } = useTranslation()

  return (
    <div
      id={id}
      className={cn("relative", className)}
    >
      <Link
        to="/events/$eventId"
        params={{ eventId: event.id }}
        aria-label={t("events.map.detailOf", { title: event.title })}
        className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <EventCard
          title={event.title}
          when={eventWhen(t, event.startAt, now, i18n.language)}
          meta={eventMeta(t, event, activityLabel)}
          taken={event.takenCount}
          min={event.minParticipants}
          max={event.maxParticipants}
          photo={event.imageUrl ? { src: event.imageUrl, alt: "" } : undefined}
          activity={event.activity.icon}
        />
      </Link>
      <Button
        variant="secondary"
        size="icon-sm"
        className="absolute top-2 right-2 shadow-float"
        aria-label={t("events.map.closePreview")}
        onClick={onClose}
      >
        <X aria-hidden />
      </Button>
    </div>
  )
}

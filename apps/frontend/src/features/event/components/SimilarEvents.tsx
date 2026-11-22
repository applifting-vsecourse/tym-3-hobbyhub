import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { similarEventsQueryOptions } from "@/features/event/api/similarEventsQueryOptions"
import { UpcomingEvents } from "@/features/event/components/UpcomingEvents"

type SimilarEventsProps = {
  eventId: string
  /** Who is signed in, or null: the answer depends on it. */
  viewerId: string | null
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
}

/**
 * Events like the one in the detail, under it. Quiet while loading, when it
 * fails and when there are none: the page is complete without it.
 */
export function SimilarEvents({ eventId, viewerId, activityLabel }: SimilarEventsProps) {
  const { t } = useTranslation()
  const { data: events } = useQuery(similarEventsQueryOptions(eventId, viewerId))

  if (!events || events.length === 0) return null

  return (
    <section
      aria-labelledby="similar-events-heading"
      className="mt-12 flex flex-col gap-4"
    >
      <h2
        id="similar-events-heading"
        className="typo-h3 text-foreground"
      >
        {t("events.detail.similar.title")}
      </h2>
      <UpcomingEvents
        events={events}
        activityLabel={activityLabel}
      />
    </section>
  )
}

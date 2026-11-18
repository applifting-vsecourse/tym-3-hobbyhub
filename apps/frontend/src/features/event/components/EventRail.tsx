import type { CSSProperties, ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { UpcomingEvents } from "@/features/event/components/UpcomingEvents"

type EventRailProps = {
  /** Names the section for the heading and its row. */
  id: string
  title: string
  /** Where "Všechny akce" leads; a row without a list of its own has none. */
  seeAll?: { search?: { location?: string } }
  events: EventListItem[]
  activityLabel: (activity: EventListItem["activity"]) => string
  isLoading?: boolean
  error?: Error | null
  onReload?: () => void
  /** What the row says instead of cards: no events, or a missing prerequisite. */
  empty?: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * A row of events (#274), on the landing page: a heading with the way to the whole list,
 * and the events to scroll sideways. Loading, empty and error are the row's own,
 * so each one can fail without taking the others with it.
 */
export function EventRail({
  id,
  title,
  seeAll,
  events,
  activityLabel,
  isLoading,
  error,
  onReload,
  empty,
  className,
  style,
}: EventRailProps) {
  const { t } = useTranslation()
  const headingId = `${id}-heading`

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-3", className)}
      style={style}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={headingId}
          className="typo-h3"
        >
          {title}
        </h2>
        {seeAll ? (
          <Link
            to="/events"
            search={seeAll.search}
            className="typo-label text-accent-foreground underline-offset-4 hover:underline"
          >
            {t("landing.rails.seeAll")}
          </Link>
        ) : null}
      </div>
      <UpcomingEvents
        events={events}
        activityLabel={activityLabel}
        isLoading={isLoading}
        error={error}
        onReload={onReload}
        empty={empty}
      />
    </section>
  )
}

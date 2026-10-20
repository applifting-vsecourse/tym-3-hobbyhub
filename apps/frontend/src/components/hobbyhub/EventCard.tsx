import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { cn } from "@/lib/utils"

type EventCardProps = {
  title: string
  /** Short when label, e.g. "Dnes 19:00". */
  when: string
  /** Place and level, e.g. "ZŠ Kobylisy · pokročilí". */
  meta: string
  taken: number
  capacity: number
  /** Without a photo the card shows the activity's icon on a muted band. */
  photo?: { src: string; alt: string }
  /** Icon key of the activity (`ACTIVITIES`); unknown keys leave the band empty. */
  activity?: string
  /** Seats pop in one by one on first render. */
  isAnimated?: boolean
  className?: string
}

/**
 * Karta akce (vzhled Soupiska) — a photo, title with a time pill and the
 * roster band. The event card is the only xl card; no gradient, no shadow.
 * The dark "chybí N" pill is one of the few places signal is allowed.
 */
export function EventCard({
  title,
  when,
  meta,
  taken,
  capacity,
  photo,
  activity,
  isAnimated = false,
  className,
}: EventCardProps) {
  const { t } = useTranslation()
  const missing = Math.max(capacity - taken, 0)

  return (
    <article
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      {photo ? (
        <img
          src={photo.src}
          alt={photo.alt}
          className="h-24 w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground"
        >
          {activity && isActivityKey(activity) ? (
            <ActivityIcon
              activity={activity}
              className="size-8"
            />
          ) : null}
        </div>
      )}
      <div className="flex flex-col gap-1 px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate typo-title text-foreground">{title}</h3>
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.75 typo-small text-accent-foreground">
            {when}
          </span>
        </div>
        <p className="typo-small text-muted-foreground">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-accent px-3.5 py-2.5">
        <RosterSeats
          size="sm"
          taken={taken}
          capacity={capacity}
          isAnimated={isAnimated}
        />
        {missing > 0 ? (
          <span className="shrink-0 rounded-full bg-signal px-2.5 py-0.75 typo-small text-signal-foreground">
            {t("hobbyhub.capacity.missing", { count: missing })}
          </span>
        ) : (
          <StatusBadge status="approved">{t("hobbyhub.capacity.full")}</StatusBadge>
        )}
      </div>
    </article>
  )
}

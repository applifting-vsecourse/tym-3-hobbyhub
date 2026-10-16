import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import LevelIcon from "@/assets/ui-icons/level.svg?react"
import MapPinIcon from "@/assets/ui-icons/map-pin.svg?react"
import type { Activity } from "@/components/hobbyhub/ActivityIcon"
import { ActivityToken } from "@/components/hobbyhub/ActivityToken"
import { missingCount, type Capacity } from "@/components/hobbyhub/capacity"
import { SeatMeter } from "@/components/hobbyhub/SeatMeter"
import { cn } from "@/lib/utils"

type EventDetailCardProps = Capacity & {
  activity: Activity
  title: string
  /** "Dnes", "Pátek"… Today is drawn in signal ink. */
  day: string
  isToday?: boolean
  time: string
  endTime: string
  place: string
  level: string
  /** The one action of the card — a full-width Button. */
  action: ReactNode
  className?: string
}

/**
 * Karta akce (detail) — one event for the detail page and the map preview.
 * Only the time is big. Listings use ScheduleRow instead.
 */
export function EventDetailCard({
  activity,
  title,
  day,
  isToday = false,
  time,
  endTime,
  place,
  level,
  action,
  className,
  ...capacity
}: EventDetailCardProps) {
  const { t } = useTranslation()
  const missing = missingCount(capacity)
  const total = capacity.max ?? capacity.min

  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-4 rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <ActivityToken activity={activity} />
        <h3 className="typo-h3 text-foreground">{title}</h3>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex flex-col">
          <p className={cn("typo-small", isToday ? "text-signal-ink" : "text-muted-foreground")}>
            {day}
          </p>
          <p className="typo-time text-foreground">{time}</p>
          <p className="typo-small text-muted-foreground">
            {t("hobbyhub.eventDetail.until", { time: endTime })}
          </p>
        </div>
        <ul className="flex flex-col gap-1.5">
          <li className="flex items-center gap-1.5 typo-small text-muted-foreground">
            <MapPinIcon
              aria-hidden
              className="size-4"
            />
            {place}
          </li>
          <li className="flex items-center gap-1.5 typo-small text-muted-foreground">
            <LevelIcon
              aria-hidden
              className="size-4"
            />
            {level}
          </li>
        </ul>
      </div>

      <SeatMeter {...capacity} />
      <p className="typo-label text-foreground">
        {missing > 0
          ? t("hobbyhub.eventDetail.seatsMissing", { taken: capacity.taken, total, count: missing })
          : t("hobbyhub.eventDetail.seatsFull", { taken: capacity.taken, total })}
      </p>

      <div className="w-full *:w-full">{action}</div>
    </article>
  )
}

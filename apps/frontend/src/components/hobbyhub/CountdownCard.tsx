import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { FriendsGoing } from "@/components/hobbyhub/FriendsGoing"
import { CardFoot, type LandingCardBase } from "@/components/hobbyhub/TicketCard"
import { cn } from "@/lib/utils"

export type CountdownCardProps = LandingCardBase & {
  startAt: Date
  /** The activity's name, next to its icon. */
  activityLabel: string
  /** Approximate place, e.g. "Hala Letná, Praha 7". */
  place: string
  /** Injectable so tests start from a known instant. */
  now?: Date
}

/** Hours, minutes and seconds until the start; zero once it has started. */
export function timeUntil(startAt: Date, now: Date) {
  const total = Math.max(Math.floor((startAt.getTime() - now.getTime()) / 1000), 0)
  return {
    total,
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

/** The clock, ticking once a second while the card is on screen. */
function useNow(initial: Date) {
  const [now, setNow] = useState(initial)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

/**
 * Odpočet (#215) — the card of "Last minute": how long until the start,
 * counted down live on a dark `signal` band. An event about to start that
 * still has free seats is people missing, which is what `signal` means; no
 * red.
 */
export function CountdownCard({
  title,
  startAt,
  activity,
  activityLabel,
  place,
  taken,
  min,
  max,
  friends = [],
  viewerState = null,
  now: initialNow = new Date(),
  className,
}: CountdownCardProps) {
  const { t } = useTranslation()
  const now = useNow(initialNow)
  const { total, hours, minutes, seconds } = timeUntil(startAt, now)
  const pad = (value: number) => String(value).padStart(2, "0")
  const countdown =
    total === 0
      ? t("hobbyhub.countdown.now")
      : hours > 0
        ? t("hobbyhub.countdown.hours", { hours, minutes: pad(minutes), seconds: pad(seconds) })
        : t("hobbyhub.countdown.minutes", { minutes, seconds: pad(seconds) })

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5 bg-signal px-4 py-3 text-signal-foreground">
        <span className="typo-caption text-signal-soft">{t("hobbyhub.countdown.label")}</span>
        {/* The seconds change every second: read once, not announced. */}
        <time
          dateTime={startAt.toISOString()}
          className="typo-h3 tabular-nums"
        >
          {countdown}
        </time>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="flex items-center gap-1.5 typo-caption text-accent-foreground">
          {activity && isActivityKey(activity) ? (
            <ActivityIcon
              activity={activity}
              className="size-4"
            />
          ) : null}
          {activityLabel}
        </p>
        <h3 className="line-clamp-2 typo-title text-foreground">{title}</h3>
        <p className="truncate typo-small text-muted-foreground">{place}</p>
        <FriendsGoing friends={friends} />
        <CardFoot
          taken={taken}
          min={min}
          max={max}
          viewerState={viewerState}
        />
      </div>
    </article>
  )
}

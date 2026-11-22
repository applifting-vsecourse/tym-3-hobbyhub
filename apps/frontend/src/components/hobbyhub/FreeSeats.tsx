import { useTranslation } from "react-i18next"

import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"
import {
  capacityLabel,
  freeCount,
  missingCount,
  PLENTY_OF_FREE_SEATS,
  ROSTER_SUMMARY_ABOVE,
} from "@/components/hobbyhub/capacity"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { cn } from "@/lib/utils"

type Seats = {
  taken: number
  /** People needed for the event to happen. */
  min: number
  /** Seats on the roster. */
  max: number
}

const SUMMARY_OPEN_SEATS = 3

/**
 * Volná místa (#215) — what an attendee needs to know: how many seats are
 * free, never how many are missing to the minimum (that is the organizer's
 * number). One seat left is "Chybíš už jenom ty"; from four on just "Volno".
 */
export function FreeSeatsLabel({
  taken,
  max,
  className,
}: Omit<Seats, "min"> & { className?: string }) {
  const { t } = useTranslation()
  const free = freeCount({ taken, max })

  if (free >= PLENTY_OF_FREE_SEATS) {
    return (
      <span className={cn("typo-label text-success-ink", className)}>
        {t("hobbyhub.capacity.freePlenty")}
      </span>
    )
  }
  if (free === 1) {
    // The viewer's own place: `primary`, like a seat they would take.
    return (
      <span className={cn("typo-label text-primary", className)}>
        {t("hobbyhub.capacity.freeLast")}
      </span>
    )
  }
  return (
    <span
      className={cn(
        "typo-caption",
        free === 0 ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      {free === 0 ? t("hobbyhub.capacity.freeNone") : t("hobbyhub.capacity.free", { count: free })}
    </span>
  )
}

/**
 * Soupiska v souhrnu (#215) — a big roster on a card: one filled seat with the
 * number of people going, then only the seats still open (at most three), so
 * a card for twenty people stays one line. Dashed is missing to the minimum,
 * a plain ring free above it, as everywhere.
 */
export function RosterSummary({ taken, min, max, className }: Seats & { className?: string }) {
  const { t } = useTranslation()
  const filled = Math.min(Math.max(taken, 0), max)
  const free = freeCount({ taken: filled, max })
  const missing = Math.min(missingCount({ taken: filled, min }), SUMMARY_OPEN_SEATS)
  const shown = Math.min(free, SUMMARY_OPEN_SEATS)

  return (
    <div
      role="img"
      aria-label={capacityLabel(t, { taken: filled, min: Math.min(min, max), max })}
      className={cn("flex items-center gap-0.75", className)}
    >
      <span className="flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-primary px-1.5 typo-caption text-primary-foreground">
        {filled}
      </span>
      {Array.from({ length: shown }, (_, index) => (
        <ActivityAvatar
          key={index}
          size="xs"
          avatar={index < missing ? "free" : "open"}
        />
      ))}
      {free > SUMMARY_OPEN_SEATS ? (
        <span
          aria-hidden
          className="px-0.5 typo-caption text-muted-foreground"
        >
          {t("hobbyhub.capacity.moreSeats")}
        </span>
      ) : null}
    </div>
  )
}

/** The roster of a card: seat by seat while it fits on a line, summed up above that. */
export function CardSeats({ taken, min, max, className }: Seats & { className?: string }) {
  return max > ROSTER_SUMMARY_ABOVE ? (
    <RosterSummary
      taken={taken}
      min={min}
      max={max}
      className={className}
    />
  ) : (
    <RosterSeats
      size="sm"
      taken={taken}
      min={min}
      capacity={max}
      className={className}
    />
  )
}

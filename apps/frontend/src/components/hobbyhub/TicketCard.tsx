import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { CardSeats, FreeSeatsLabel } from "@/components/hobbyhub/FreeSeats"
import { FriendsGoing, type FriendGoing } from "@/components/hobbyhub/FriendsGoing"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { cn } from "@/lib/utils"

export type ViewerState = "JOINED" | "PENDING" | null

type LandingCardBase = {
  title: string
  /** Icon key of the activity (`ACTIVITIES`); unknown keys show no icon. */
  activity?: string
  taken: number
  /** People needed for the event to happen. */
  min: number
  /** Seats on the roster. */
  max: number
  /** The viewer's friends going who allowed it (ADR-0026). */
  friends?: FriendGoing[]
  /** What the viewer already is on the event: a seat, or a request. */
  viewerState?: ViewerState
  className?: string
}

export type TicketCardProps = LandingCardBase & {
  /** Short day, e.g. "Dnes", "Zítra", "so 21. 11.". */
  day: string
  /** Start time, e.g. "19:00". */
  time: string
  /** Approximate place, e.g. "Hala Letná, Praha 7". */
  place: string
}

/** "Jdeš" or "Žádost odeslána" in place of the free seats, once the viewer is in. */
export function ViewerStateBadge({ state }: { state: ViewerState }) {
  const { t } = useTranslation()
  if (state === "JOINED") {
    return <StatusBadge status="approved">{t("hobbyhub.viewerState.joined")}</StatusBadge>
  }
  if (state === "PENDING") {
    return <StatusBadge status="pending">{t("hobbyhub.viewerState.pending")}</StatusBadge>
  }
  return null
}

/** The foot of a landing card: the roster, then the viewer's state or the free seats. */
export function CardFoot({
  taken,
  min,
  max,
  viewerState,
  className,
}: Pick<LandingCardBase, "taken" | "min" | "max" | "viewerState" | "className">) {
  return (
    // The seats keep their one line; when the words do not fit beside them
    // (a narrow card, a longer language), they move under the seats rather
    // than squeezing them or running out of the card.
    <div
      className={cn(
        "mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-2",
        className,
      )}
    >
      <CardSeats
        taken={taken}
        min={min}
        max={max}
        className="shrink-0 flex-nowrap"
      />
      {viewerState ? (
        <ViewerStateBadge state={viewerState} />
      ) : (
        <FreeSeatsLabel
          taken={taken}
          max={max}
          className="whitespace-nowrap"
        />
      )}
    </div>
  )
}

// "5:00 PM" is too wide for the stub: the clock stays big, the part of the
// day ("PM", "dop.") goes small under it. A 24-hour time has none.
const DAY_PERIOD = /^(\d{1,2}[:.]\d{2})\s*(\S.*)$/u

/** The start time on the stub, on one line whatever the language. */
export function TicketTime({ time }: { time: string }) {
  const [, clock, period] = DAY_PERIOD.exec(time) ?? []
  return clock && period ? (
    <span className="flex flex-col items-center">
      <span className="typo-h3 whitespace-nowrap">{clock}</span>
      <span className="typo-caption">{period}</span>
    </span>
  ) : (
    <span className="typo-h3 whitespace-nowrap">{time}</span>
  )
}

function Icon({ activity, className }: { activity?: string; className?: string }): ReactNode {
  return activity && isActivityKey(activity) ? (
    <ActivityIcon
      activity={activity}
      className={className}
    />
  ) : null
}

/**
 * Vstupenka (#215) — the main card of the landing page: a stub with the day,
 * the time and the activity, torn off along a dashed line from the body with
 * the event. The stub is the quiet `accent` surface the time sits on
 * elsewhere, stamped `success` or `pending` once the viewer holds a seat or
 * asked for one; no photo, so an organizer's picture can never hide the time.
 */
export function TicketCard({
  title,
  day,
  time,
  place,
  activity,
  taken,
  min,
  max,
  friends = [],
  viewerState = null,
  className,
}: TicketCardProps) {
  const { t } = useTranslation()

  return (
    <article className={cn("grid h-full grid-cols-[5.5rem_1fr] rounded-xl", className)}>
      {/* The stub is stamped once the viewer is in: green with a seat, the
          waiting colour with a request. The foot always keeps the seats. */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 rounded-l-xl border border-r-0 border-border px-2 py-4 text-center",
          viewerState === "JOINED"
            ? "bg-success-soft text-success-ink"
            : viewerState === "PENDING"
              ? "bg-pending-soft text-pending-ink"
              : "bg-accent text-accent-foreground",
        )}
      >
        <span className="typo-caption">{day}</span>
        <TicketTime time={time} />
        <Icon
          activity={activity}
          className="mt-1 size-6"
        />
        {viewerState ? (
          <span className="mt-1.5 typo-caption">
            {viewerState === "JOINED"
              ? t("hobbyhub.viewerState.joined")
              : t("hobbyhub.viewerState.waiting")}
          </span>
        ) : null}
      </div>
      {/* The perforation: a dashed edge with a notch top and bottom, cut out
          of the page's background. */}
      <div className="relative flex min-w-0 flex-col gap-1.5 rounded-r-xl border border-l-0 border-border bg-card p-4 before:absolute before:-top-2 before:-left-2 before:size-4 before:rounded-full before:border before:border-border before:bg-background after:absolute after:-bottom-2 after:-left-2 after:size-4 after:rounded-full after:border after:border-border after:bg-background">
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 border-l-2 border-dashed border-border"
        />
        <h3 className="line-clamp-2 typo-title text-foreground">{title}</h3>
        <p className="truncate typo-small text-muted-foreground">{place}</p>
        <FriendsGoing friends={friends} />
        <CardFoot
          taken={taken}
          min={min}
          max={max}
        />
      </div>
    </article>
  )
}

export type { LandingCardBase }

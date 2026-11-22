import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { missingCount, type Capacity } from "@/components/hobbyhub/capacity"
import { EventPhoto } from "@/components/hobbyhub/EventPhoto"
import { SeatMeter } from "@/components/hobbyhub/SeatMeter"
import { cn } from "@/lib/utils"

type ScheduleRowProps = Capacity & {
  /** The date, the first thing a row says: "Dnes", "15. 10.". */
  day: string
  /** Under the date, small: "čt 19:00". */
  time: string
  title: string
  /** Place and level, e.g. "Hala ZŠ Dolní, pokročilí". */
  subtitle: string
  /** Without a photo the row shows the activity's icon on a muted square, like `EventCard`. */
  photo?: { src: string; alt: string }
  /** Icon key of the activity (`ACTIVITIES`); unknown keys leave the square empty. */
  activity?: string
  /**
   * Who runs it and what it costs, e.g. "Pořádá Jana Nováková · 150 Kč". Only
   * on a large screen (#224), where the row has room; a phone keeps it short.
   */
  details?: string
  /** A state of the person on this event (`StatusBadge`), under the subtitle. */
  badge?: ReactNode
  className?: string
}

/**
 * Řádek rozpisu — the main item of an event listing: date with the time under
 * it, title with place and level, small seats and a status word. No card, no
 * shadow; rows are separated by a hairline. The photo only appears where the
 * row is wide (below that it would just make every row taller).
 *
 * The row reads its own width (a container query), not the screen's: in the
 * narrow list beside the map everything stacks, while a row as wide as a page
 * (Moje akce) puts the photo beside the time and its texts in two columns, so
 * it uses the width instead of growing tall (#224).
 */
export function ScheduleRow({
  day,
  time,
  title,
  subtitle,
  photo,
  activity,
  details,
  badge,
  className,
  ...capacity
}: ScheduleRowProps) {
  const { t } = useTranslation()
  const missing = missingCount(capacity)

  return (
    <div className={cn("@container border-t border-border", className)}>
      <div className="flex items-start gap-3 py-4 @3xl:gap-6">
        {/* Narrow: the date column, then the texts, then the seats — one compact
          line of facts per event. Wide: the photo joins the date column. */}
        <div className="flex shrink-0 @3xl:items-center @3xl:gap-4">
          <div className="flex w-20 flex-col @3xl:w-24">
            <p className="typo-h3 text-foreground">{day}</p>
            <p className="typo-small text-muted-foreground">{time}</p>
          </div>
          {photo ? (
            <EventPhoto
              src={photo.src}
              alt={photo.alt}
              className="hidden h-14 @3xl:block @3xl:w-22"
            />
          ) : (
            <div
              aria-hidden
              className="hidden h-14 items-center justify-center rounded-md bg-muted text-muted-foreground @3xl:flex @3xl:w-22"
            >
              {activity && isActivityKey(activity) ? (
                <ActivityIcon
                  activity={activity}
                  className="size-6"
                />
              ) : null}
            </div>
          )}
        </div>
        {/* Wide: what and where on the left, who runs it and the person's state
          on the right, each column stacking on its own. Narrow: one stack. */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 @3xl:flex-row @3xl:gap-6">
          <div className="flex min-w-0 flex-col gap-0.5 @3xl:flex-3">
            <h3 className="typo-title text-foreground">{title}</h3>
            <p className="typo-small text-muted-foreground">{subtitle}</p>
          </div>
          <div className="contents @3xl:flex @3xl:min-w-0 @3xl:flex-2 @3xl:flex-col @3xl:gap-1.5 @3xl:pt-0.5">
            {details ? (
              <p className="hidden typo-small text-muted-foreground lg:block">{details}</p>
            ) : null}
            {badge ? <div className="mt-1.5 @3xl:mt-0">{badge}</div> : null}
          </div>
        </div>
        {/* One width for every row and aligned to the right edge, so the seats and
          the word under them stay in one column whatever the word says (#177).
          A long table of seats may widen it rather than run into the title. */}
        <div className="flex min-w-28 shrink-0 flex-col items-end gap-2 text-right">
          <SeatMeter
            size="sm"
            {...capacity}
          />
          <p className={cn("typo-small", missing > 0 ? "text-signal-ink" : "text-success-ink")}>
            {missing > 0
              ? t("hobbyhub.capacity.missing", { count: missing })
              : t("hobbyhub.capacity.full")}
          </p>
        </div>
      </div>
    </div>
  )
}

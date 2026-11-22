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
  /**
   * Activity, place and level, e.g. "Florbal · Hala ZŠ Dolní · pokročilí".
   * A narrow row keeps it to one line, so put what matters most first.
   */
  subtitle: string
  /** How far away it is, e.g. "1,2 km". Narrow: at the end of the seats line; wide: beside the badge. */
  distance?: string
  /** Without a photo the row shows the activity's icon on a muted square, like `EventCard`. */
  photo?: { src: string; alt: string }
  /** Icon key of the activity (`ACTIVITIES`); unknown keys leave the square empty. */
  activity?: string
  /**
   * Who runs it and what it costs, e.g. "Pořádá Jana Nováková · 150 Kč". Only
   * on a large screen (#224), where the row has room; a phone keeps it short.
   */
  details?: string
  /** A state of the person on this event (`StatusBadge`). Narrow: at the end of the seats line; wide: under who runs it. */
  badge?: ReactNode
  /**
   * The caller puts a 44px menu over the narrow row's top right corner (Moje
   * akce): the title leaves it room instead of running under it (#294).
   */
  hasCornerMenu?: boolean
  className?: string
}

/**
 * Řádek rozpisu — the main item of an event listing: date with the time under
 * it, title with place and level, small seats and a status word. No card, no
 * shadow; rows are separated by a hairline. The photo only appears where the
 * row is wide (below that it would just make every row taller).
 *
 * The row reads its own width (a container query), not the screen's (#224):
 * - Narrow (a phone, the list beside the map): the date column, then the texts
 *   with the seats, "chybí N" and the badge on one line under them. The title
 *   gets every pixel the date leaves, so a row stays about 100px tall (#294).
 * - Wide (Moje akce on a computer): a grid — date and photo, what and where,
 *   who runs it and the person's state, and the seats in a column aligned to
 *   the right edge (#177). The same elements, placed by `display: contents`,
 *   so nothing is rendered twice.
 */
export function ScheduleRow({
  day,
  time,
  title,
  subtitle,
  distance,
  photo,
  activity,
  details,
  badge,
  hasCornerMenu = false,
  className,
  ...capacity
}: ScheduleRowProps) {
  const { t } = useTranslation()
  const missing = missingCount(capacity)

  return (
    <div className={cn("@container border-t border-border", className)}>
      <div className="flex items-start gap-3 py-3 @3xl:grid @3xl:grid-cols-[auto_minmax(0,3fr)_minmax(0,2fr)_auto] @3xl:grid-rows-[auto_1fr] @3xl:gap-x-6 @3xl:gap-y-0.5 @3xl:py-4">
        <div className="flex shrink-0 @3xl:row-span-2 @3xl:items-center @3xl:gap-4">
          <div className="flex w-16 flex-col @3xl:w-24">
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
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5 @3xl:contents">
          <h3
            className={cn(
              "line-clamp-2 typo-title text-foreground @3xl:col-start-2 @3xl:row-start-1 @3xl:line-clamp-none",
              hasCornerMenu && "pr-10 @3xl:pr-0",
            )}
          >
            {title}
          </h3>
          <p className="truncate typo-small text-muted-foreground @3xl:col-start-2 @3xl:row-start-2 @3xl:whitespace-normal">
            {subtitle}
          </p>
          {details ? (
            <p className="hidden typo-small text-muted-foreground lg:block @3xl:col-start-3 @3xl:row-start-1 @3xl:pt-0.5">
              {details}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 @3xl:contents">
            {/* Wide: one width for every row and aligned to the right edge, so
              the seats and the word under them stay in one column whatever the
              word says (#177). */}
            <div className="flex items-center gap-2 @3xl:col-start-4 @3xl:row-span-2 @3xl:row-start-1 @3xl:min-w-28 @3xl:flex-col @3xl:items-end @3xl:text-right">
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
            {badge || distance ? (
              <div
                className={cn(
                  "ml-auto flex items-center gap-2 @3xl:col-start-3 @3xl:ml-0 @3xl:flex-col @3xl:items-start @3xl:gap-1.5",
                  details ? "@3xl:row-start-2 @3xl:pt-1" : "@3xl:row-start-1 @3xl:pt-0.5",
                )}
              >
                {badge}
                {distance ? <p className="typo-small text-muted-foreground">{distance}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

import type { ReactNode } from "react"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type GroupRowProps = {
  title: string
  /** Place, activity and members, e.g. "Praha 8 · florbal · 14 členů". */
  subtitle: string
  /** Icon key of the activity (`ACTIVITIES`); unknown keys leave the square empty. */
  activity?: string
  /**
   * When the group usually meets and the start of its description. Only on a
   * large screen (#224), where the row has room; a phone keeps it short.
   */
  schedule?: string | null
  description?: string | null
  /** What the viewer is to the group, or its visibility; under the subtitle. */
  badge?: string
  /** Wording of the "active group" mark next to the title; none means no mark (#269). */
  activeLabel?: string
  /** How the group takes people in, in the accent colour under the details (ADR-0028). */
  approval?: string
  /** The next event of the group: a tinted band under the row, like the roster band of a card. */
  nextEvent?: ReactNode
  className?: string
}

/**
 * Řádek skupiny — the main item of a group listing, built like `ScheduleRow`:
 * the activity icon on a square, the title with its details under it. No card,
 * no shadow; rows are separated by a hairline. Groups have no photos yet.
 */
export function GroupRow({
  title,
  subtitle,
  activity,
  schedule,
  description,
  badge,
  activeLabel,
  approval,
  nextEvent,
  className,
}: GroupRowProps) {
  return (
    <div className={cn("flex items-start gap-3 border-t border-border py-4", className)}>
      <div
        aria-hidden
        className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
      >
        {activity && isActivityKey(activity) ? (
          <ActivityIcon
            activity={activity}
            className="size-6"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="typo-title text-foreground">{title}</h3>
          {activeLabel ? <Badge variant="success">{activeLabel}</Badge> : null}
        </div>
        <p className="typo-small text-muted-foreground">{subtitle}</p>
        {schedule ? <p className="hidden typo-small text-foreground lg:block">{schedule}</p> : null}
        {/* Two lines at most and no wider than a line of reading, however wide the list. */}
        {description ? (
          <p className="hidden max-w-prose typo-small break-words text-muted-foreground lg:line-clamp-2">
            {description}
          </p>
        ) : null}
        {approval ? <p className="typo-small text-primary">{approval}</p> : null}
        {badge ? <p className="typo-small text-primary">{badge}</p> : null}
        {nextEvent ? (
          <p className="mt-2 rounded-md bg-accent px-3 py-2 typo-small text-accent-foreground">
            {nextEvent}
          </p>
        ) : null}
      </div>
    </div>
  )
}

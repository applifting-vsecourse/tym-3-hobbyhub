import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { cn } from "@/lib/utils"

type GroupRowProps = {
  title: string
  /** Place, activity and members, e.g. "Praha 8 · florbal · 14 členů". */
  subtitle: string
  /** Icon key of the activity (`ACTIVITIES`); unknown keys leave the square empty. */
  activity?: string
  /** What the viewer is to the group, or its visibility; under the subtitle. */
  badge?: string
  className?: string
}

/**
 * Řádek skupiny — the main item of a group listing, built like `ScheduleRow`:
 * the activity icon on a square, the title with its details under it. No card,
 * no shadow; rows are separated by a hairline. Groups have no photos yet.
 */
export function GroupRow({ title, subtitle, activity, badge, className }: GroupRowProps) {
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
        <h3 className="typo-title text-foreground">{title}</h3>
        <p className="typo-small text-muted-foreground">{subtitle}</p>
        {badge ? <p className="typo-small text-primary">{badge}</p> : null}
      </div>
    </div>
  )
}

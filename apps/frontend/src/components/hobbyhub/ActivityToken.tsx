import { ActivityIcon, type Activity } from "@/components/hobbyhub/ActivityIcon"
import { cn } from "@/lib/utils"

type ActivityTokenProps = {
  activity: Activity
  isSelected?: boolean
  /** Pass when the token stands alone and the activity is not named next to it. */
  label?: string
  className?: string
}

/** Žeton aktivity — a neutral circle holding an activity icon. */
export function ActivityToken({
  activity,
  isSelected = false,
  label,
  className,
}: ActivityTokenProps) {
  return (
    <span
      data-slot="activity-token"
      data-selected={isSelected}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground",
        isSelected ? "bg-accent" : "bg-muted",
        className,
      )}
    >
      <ActivityIcon
        activity={activity}
        label={label}
        className="size-5"
      />
    </span>
  )
}

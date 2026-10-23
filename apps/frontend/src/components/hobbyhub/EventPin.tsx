import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { cn } from "@/lib/utils"

export type EventPinState = "missing" | "full" | "selected"

type EventPinProps = {
  /** Key of the activity icon; an unknown key just shows no icon. */
  activity: string
  title: string
  /** How many people are missing, as words: "chybí 2". Empty for a full event. */
  missingLabel?: string
  /** `missing`: people are still needed; `full`: minimum reached; `selected`: the open one. */
  state: EventPinState
  /** Just the sport icon, for a crowded map; the name comes with a closer zoom. */
  isCompact?: boolean
  className?: string
}

const STATE_CLASSES: Record<EventPinState, string> = {
  missing: "bg-signal text-signal-foreground",
  full: "bg-success text-success-foreground",
  // Light with a dark outline: the other two are solid, so it cannot be mistaken for one.
  selected: "bg-background text-foreground ring-[3px] ring-foreground",
}

/**
 * Špendlík akce na mapě — a pill with the sport icon, the event's name and how
 * many people are missing, so a pin says what it is without being opened.
 * Colour says whether people are missing (graphite), the event is full (green)
 * or it is the selected one (light, with a dark outline). Wrap it in a button to make
 * it interactive.
 */
export function EventPin({
  activity,
  title,
  missingLabel,
  state,
  isCompact = false,
  className,
}: EventPinProps) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center rounded-full shadow-float",
        isCompact ? "size-9 justify-center" : "max-w-64 gap-1.5 py-1 pr-3 pl-2",
        STATE_CLASSES[state],
        className,
      )}
    >
      {isActivityKey(activity) ? (
        <ActivityIcon
          activity={activity}
          className="size-5"
        />
      ) : null}
      {isCompact ? (
        // An unknown sport has no icon: its first letter stands in.
        isActivityKey(activity) ? null : (
          <span className="typo-label">{title.charAt(0)}</span>
        )
      ) : (
        <span className="truncate typo-label">{title}</span>
      )}
      {missingLabel && !isCompact ? (
        <span className="shrink-0 typo-caption whitespace-nowrap opacity-80">{missingLabel}</span>
      ) : null}
    </span>
  )
}

type EventClusterPinProps = {
  /** "9 akcí": what the pin groups. */
  label: string
  className?: string
}

/** Several events close together, named in words ("9 akcí") on a neutral pill. */
export function EventClusterPin({ label, className }: EventClusterPinProps) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center rounded-full border border-border bg-popover px-3 text-popover-foreground shadow-float",
        className,
      )}
    >
      <span className="typo-label whitespace-nowrap">{label}</span>
    </span>
  )
}

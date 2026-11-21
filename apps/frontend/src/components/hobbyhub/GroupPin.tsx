import { UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type GroupPinProps = {
  /** How many members the group has. */
  count: number
  className?: string
}

/**
 * Špendlík skupiny na mapě — a pill with the member count. A group meets around
 * a place, not at an exact spot, so the pin carries no name and no activity:
 * the list beside the map has them. Wrap it in a link to make it interactive.
 */
export function GroupPin({ count, className }: GroupPinProps) {
  return (
    <span
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-full border-2 border-primary bg-card px-3 typo-label text-primary drop-shadow-float",
        className,
      )}
    >
      <UsersIcon
        aria-hidden
        className="size-4"
      />
      {count}
    </span>
  )
}

type GroupClusterPinProps = {
  /** How many groups the pin gathers. */
  count: number
  className?: string
}

/** Several groups in one place: the count on a round pill. Wrap it in a button that zooms in. */
export function GroupClusterPin({ count, className }: GroupClusterPinProps) {
  return (
    <span
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border-2 border-primary bg-card typo-label text-primary drop-shadow-float",
        className,
      )}
    >
      {count}
    </span>
  )
}

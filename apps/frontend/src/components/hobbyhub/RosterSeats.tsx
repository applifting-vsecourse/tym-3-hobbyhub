import { Fragment, type CSSProperties } from "react"
import { cva } from "class-variance-authority"

import { ActivityAvatar, AVATAR_KINDS } from "@/components/hobbyhub/ActivityAvatar"
import { capacityLabel } from "@/components/hobbyhub/capacity"
import { cn } from "@/lib/utils"

const rosterVariants = cva("w-fit", {
  variants: {
    size: {
      sm: "flex flex-wrap items-center gap-0.75",
      md: "flex flex-wrap items-center gap-1",
      lg: "grid w-full max-w-73 grid-cols-5 gap-2",
      xl: "grid w-full max-w-124 grid-cols-5 gap-3.5",
    },
  },
})

const avatarSize = { sm: "xs", md: "sm", lg: "lg", xl: "2xl" } as const

type RosterSeatsProps = {
  /** People already on the roster. */
  taken: number
  /** Seats on the roster; the rest are drawn as dashed empty seats. */
  capacity: number
  size?: keyof typeof avatarSize
  /** `dark` for the signal surface (hero, roster band in e-mails). */
  surface?: "light" | "dark"
  /** Seats pop in one after another on first render. Off by default: rosters in lists must not replay it. */
  isAnimated?: boolean
  className?: string
}

/**
 * Soupiska míst — every event is a roster. Taken seats are activity avatars,
 * empty seats are dashed circles with a plus.
 */
export function RosterSeats({
  taken,
  capacity,
  size = "md",
  surface = "light",
  isAnimated = false,
  className,
}: RosterSeatsProps) {
  const filled = Math.min(Math.max(taken, 0), capacity)

  return (
    <div
      role="img"
      aria-label={capacityLabel({ taken: filled, min: capacity })}
      className={cn(rosterVariants({ size }), className)}
    >
      {Array.from({ length: capacity }, (_, index) => {
        const seat = (
          <ActivityAvatar
            size={avatarSize[size]}
            avatar={index < filled ? (AVATAR_KINDS[index % AVATAR_KINDS.length] ?? "free") : "free"}
            tone={surface === "dark" ? "inverse" : "default"}
            // In the 5-column grids each seat fills its column, so the roster shrinks on small phones.
            isFluid={size === "lg" || size === "xl"}
          />
        )
        // Seats have no identity beyond their position.
        return isAnimated ? (
          <span
            key={index}
            className="flex seat-enter"
            style={{ "--seat-index": index } as CSSProperties}
          >
            {seat}
          </span>
        ) : (
          <Fragment key={index}>{seat}</Fragment>
        )
      })}
    </div>
  )
}

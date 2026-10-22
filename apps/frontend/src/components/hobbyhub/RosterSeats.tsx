import { Fragment, type CSSProperties } from "react"
import { cva } from "class-variance-authority"
import { useTranslation } from "react-i18next"

import { ActivityAvatar, AVATAR_KINDS } from "@/components/hobbyhub/ActivityAvatar"
import { capacityLabel, seatStates } from "@/components/hobbyhub/capacity"
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
  /** Seats on the roster. */
  capacity: number
  /**
   * People needed for the event to happen. Empty seats up to it are drawn
   * dashed (missing), the ones above it as plain rings. Defaults to
   * `capacity`: every empty seat is missing.
   */
  min?: number
  size?: keyof typeof avatarSize
  /** `dark` for the signal surface (hero, roster band in e-mails). */
  surface?: "light" | "dark"
  /** Seats pop in one after another on first render. Off by default: rosters in lists must not replay it. */
  isAnimated?: boolean
  className?: string
}

/**
 * Soupiska míst — every event is a roster. Taken seats are activity avatars,
 * seats missing to the minimum are dashed circles with a plus, seats above
 * the minimum plain rings.
 */
export function RosterSeats({
  taken,
  capacity,
  min = capacity,
  size = "md",
  surface = "light",
  isAnimated = false,
  className,
}: RosterSeatsProps) {
  const { t } = useTranslation()
  const filled = Math.min(Math.max(taken, 0), capacity)
  const seats = seatStates({ taken: filled, min: Math.min(min, capacity), max: capacity })

  return (
    <div
      role="img"
      aria-label={capacityLabel(t, { taken: filled, min: Math.min(min, capacity), max: capacity })}
      className={cn(rosterVariants({ size }), className)}
    >
      {seats.map((state, index) => {
        const seat = (
          <ActivityAvatar
            size={avatarSize[size]}
            avatar={
              state === "taken"
                ? (AVATAR_KINDS[index % AVATAR_KINDS.length] ?? "free")
                : state === "missing"
                  ? "free"
                  : "open"
            }
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

import { cva, type VariantProps } from "class-variance-authority"

import basketbalista from "@/assets/avatars/basketbalista.svg"
import bezec from "@/assets/avatars/bezec.svg"
import cyklista from "@/assets/avatars/cyklista.svg"
import deskar from "@/assets/avatars/deskar.svg"
import florbalista from "@/assets/avatars/florbalista.svg"
import fotbalista from "@/assets/avatars/fotbalista.svg"
import hracHer from "@/assets/avatars/hrac-her.svg"
import joginka from "@/assets/avatars/joginka.svg"
import plavkyne from "@/assets/avatars/plavkyne.svg"
import tenistka from "@/assets/avatars/tenistka.svg"
import turistka from "@/assets/avatars/turistka.svg"
import volejbalistka from "@/assets/avatars/volejbalistka.svg"
import PlusIcon from "@/assets/ui-icons/plus.svg?react"
import { cn } from "@/lib/utils"

/** Illustrated people from Figma "Avatary sportovců a koníčkářů (Avatar)". */
export const AVATARS = {
  florbalista: { src: florbalista },
  volejbalistka: { src: volejbalistka },
  tenistka: { src: tenistka },
  bezec: { src: bezec },
  cyklista: { src: cyklista },
  plavkyne: { src: plavkyne },
  fotbalista: { src: fotbalista },
  basketbalista: { src: basketbalista },
  deskar: { src: deskar },
  "hrac-her": { src: hracHer },
  turistka: { src: turistka },
  joginka: { src: joginka },
} as const

export type AvatarKind = keyof typeof AVATARS

export const AVATAR_KINDS = Object.keys(AVATARS) as AvatarKind[]

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center rounded-full",
  {
    variants: {
      size: {
        xs: "size-5.5",
        sm: "size-8",
        md: "size-10",
        lg: "size-13",
        xl: "size-14",
        "2xl": "size-22",
      },
    },
    defaultVariants: { size: "md" },
  },
)

// The dashed ring scales with the avatar, as in Figma (2 px at 40 px).
const freeBorder = {
  xs: "border",
  sm: "border-2",
  md: "border-2",
  lg: "border-2",
  xl: "border-2",
  "2xl": "border-4",
} as const

type ActivityAvatarProps = VariantProps<typeof avatarVariants> & {
  /**
   * An illustrated person, `"free"` for the dashed empty seat that is missing
   * to the minimum, or `"open"` for a plain ring: a seat above the minimum.
   */
  avatar: AvatarKind | "free" | "open"
  /** `inverse` draws the empty seat for the dark signal surface (hero). */
  tone?: "default" | "inverse"
  /** The person's name when the avatar stands alone; empty when a name sits next to it. */
  alt?: string
  /** Fill the parent's width instead of the fixed size (rosters in a grid); `size` still sets the ring. */
  isFluid?: boolean
  className?: string
}

/**
 * Illustrated avatar instead of a photo or initials. The face is always blank.
 * An empty seat missing to the minimum is a dashed circle with a plus; a seat
 * above the minimum is a plain ring, like `Seat` in the "free" state.
 */
export function ActivityAvatar({
  avatar,
  size,
  tone = "default",
  alt = "",
  isFluid = false,
  className,
}: ActivityAvatarProps) {
  const boxClass = isFluid ? avatarVariants({ size: null }) : avatarVariants({ size })
  const fluidClass = isFluid ? "aspect-square w-full" : undefined
  if (avatar === "open") {
    return (
      <span
        data-slot="activity-avatar"
        className={cn(
          boxClass,
          fluidClass,
          freeBorder[size ?? "md"],
          tone === "inverse" ? "border-signal-soft/40" : "border-input",
          className,
        )}
      >
        {alt ? <span className="sr-only">{alt}</span> : null}
      </span>
    )
  }

  if (avatar === "free") {
    return (
      <span
        data-slot="activity-avatar"
        className={cn(
          boxClass,
          fluidClass,
          freeBorder[size ?? "md"],
          "border-dashed",
          tone === "inverse" ? "border-signal-soft text-signal-soft" : "border-signal text-signal",
          className,
        )}
      >
        <PlusIcon
          aria-hidden
          className="size-[45%]"
        />
        {alt ? <span className="sr-only">{alt}</span> : null}
      </span>
    )
  }

  return (
    <span
      data-slot="activity-avatar"
      className={cn(boxClass, fluidClass, "overflow-hidden", className)}
    >
      <img
        src={AVATARS[avatar].src}
        alt={alt}
        className="size-full"
      />
    </span>
  )
}

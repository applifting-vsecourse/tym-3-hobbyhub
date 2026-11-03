import { coverSrc } from "@/components/hobbyhub/profileCovers"
import { cn } from "@/lib/utils"

type ProfileCoverProps = {
  /** The chosen cover: an id, the person's own picture as a data URL, or none. */
  cover: string | null | undefined
  /** Icon key of the first sport: what the profile wears when no cover is chosen. */
  firstActivityIcon?: string
  className?: string
}

/** Úvodní grafika profilu — the picture across the top, cropped to the page's width. */
export function ProfileCover({ cover, firstActivityIcon, className }: ProfileCoverProps) {
  return (
    <img
      src={coverSrc(cover, firstActivityIcon)}
      alt=""
      className={cn("h-28 w-full rounded-xl bg-accent object-cover md:h-36", className)}
    />
  )
}

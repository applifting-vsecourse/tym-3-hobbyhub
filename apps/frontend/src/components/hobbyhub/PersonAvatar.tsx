import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const SIZES = {
  md: "size-10",
  xl: "size-14",
} as const

/**
 * Up to two initials from the letters of the name, e.g. "Honza Krupka" → "HK",
 * "Admin (Pond)" → "AP".
 */
export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((word) => /\p{L}/u.exec(word)?.[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

type PersonAvatarProps = {
  name: string
  /** Photo URL; until the person adds one, their initials stand in. */
  photo?: string | null
  size?: keyof typeof SIZES
  className?: string
}

/** A real person's photo. Decorative: the name next to it says who it is. */
export function PersonAvatar({ name, photo, size = "md", className }: PersonAvatarProps) {
  return (
    <Avatar
      aria-hidden
      className={cn(SIZES[size], className)}
    >
      {photo ? (
        <AvatarImage
          src={photo}
          alt=""
          className="object-cover"
        />
      ) : null}
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  )
}

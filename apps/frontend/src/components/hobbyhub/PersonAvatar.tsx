import { ActivityAvatar, AVATARS, type AvatarKind } from "@/components/hobbyhub/ActivityAvatar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const SIZES = {
  md: "size-10",
  xl: "size-14",
  "2xl": "size-24 text-3xl md:size-28",
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

const AVATAR_PREFIX = "avatar:"

/** The illustration a stored picture names, if it names one of ours. */
export function illustrationOf(picture: string | null | undefined): AvatarKind | null {
  if (!picture?.startsWith(AVATAR_PREFIX)) return null
  const kind = picture.slice(AVATAR_PREFIX.length)
  return Object.hasOwn(AVATARS, kind) ? (kind as AvatarKind) : null
}

export const avatarPicture = (kind: AvatarKind) => `${AVATAR_PREFIX}${kind}`

type PersonAvatarProps = {
  name: string
  /**
   * Photo URL, or `avatar:<name>` for one of our illustrated people; until the
   * person picks one, their initials stand in.
   */
  photo?: string | null
  size?: keyof typeof SIZES
  className?: string
}

/** A real person's photo. Decorative: the name next to it says who it is. */
export function PersonAvatar({ name, photo, size = "md", className }: PersonAvatarProps) {
  const illustration = illustrationOf(photo)
  if (illustration) {
    return (
      <ActivityAvatar
        avatar={illustration}
        size={size === "2xl" ? "2xl" : size === "xl" ? "xl" : "md"}
        className={cn(size === "2xl" && "size-24 md:size-28", className)}
      />
    )
  }

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

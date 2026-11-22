import { useTranslation } from "react-i18next"

import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { cn } from "@/lib/utils"

export type FriendGoing = { name: string; photo: string | null }

const SHOWN_AVATARS = 3

/**
 * Jdou přátelé (#215) — the viewer's friends going, as small avatars and a
 * line of text. Only friends who allowed it ever get here (ADR-0026); the
 * component shows whoever it is given, and nothing when nobody.
 */
export function FriendsGoing({
  friends,
  className,
}: {
  friends: FriendGoing[]
  className?: string
}) {
  const { t } = useTranslation()
  const [first, second] = friends
  if (!first) return null

  const text =
    friends.length === 1
      ? t("hobbyhub.friendsGoing.one", { name: first.name })
      : friends.length === 2
        ? t("hobbyhub.friendsGoing.two", { first: first.name, second: second?.name })
        : t("hobbyhub.friendsGoing.many", { first: first.name, count: friends.length - 1 })

  return (
    <p className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex shrink-0 -space-x-1.5"
      >
        {friends.slice(0, SHOWN_AVATARS).map((friend) => (
          <PersonAvatar
            key={friend.name}
            name={friend.name}
            photo={friend.photo}
            className="size-6 ring-2 ring-card"
          />
        ))}
      </span>
      <span className="min-w-0 truncate typo-small text-foreground">{text}</span>
    </p>
  )
}

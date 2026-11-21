import { Fragment, useId, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { EventFriend } from "@/features/event/api/eventSchemas"

/** Named at first; the others behind "a 2 další". */
const NAMED = 3

type FriendsOnEventProps = {
  friends: EventFriend[]
  /** Going (until the end of the event), or were there (after it). */
  period: "upcoming" | "past"
  /**
   * `band`: the tinted band in an event's detail; `line`: the quiet line under
   * an event in „Akce přátel“.
   */
  variant: "band" | "line"
  className?: string
}

/**
 * #226: which of my friends go to an event or organize it, or were there:
 * their avatars and three names, each a link to the profile; "a 2 další"
 * lists them all, one per line. Nothing when no friend goes.
 */
export function FriendsOnEvent({ friends, period, variant, className }: FriendsOnEventProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const listId = useId()
  if (friends.length === 0) return null

  const label = t(`events.friends.${period}`, { count: friends.length })
  const named = friends.slice(0, NAMED)
  const others = friends.length - named.length
  const box = cn(
    variant === "band"
      ? "rounded-lg bg-accent px-4 py-3 typo-body text-accent-foreground"
      : // A narrow column beside the seats on phones: the smallest type.
        "typo-caption text-foreground",
    className,
  )
  const profileLink = (friend: EventFriend) => (
    <Link
      to="/profile/$userId"
      params={{ userId: friend.id }}
      className="relative font-medium underline underline-offset-4 focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
    >
      {friend.name}
    </Link>
  )
  const toggle = (
    <Button
      type="button"
      variant="link"
      aria-expanded={isExpanded}
      aria-controls={listId}
      className="relative h-auto min-h-6 p-0 text-[length:inherit] font-medium text-inherit underline underline-offset-4"
      onClick={() => setIsExpanded((isOpen) => !isOpen)}
    >
      {isExpanded ? t("events.friends.less") : t("events.friends.more", { count: others })}
    </Button>
  )

  if (isExpanded) {
    return (
      <div
        id={listId}
        className={cn(box, "flex flex-col gap-2")}
      >
        <p>{label}</p>
        <ul className="flex flex-col gap-2">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className="flex items-center gap-2"
            >
              <PersonAvatar
                name={friend.name}
                photo={friend.image}
                size="sm"
              />
              {profileLink(friend)}
            </li>
          ))}
        </ul>
        <div>{toggle}</div>
      </div>
    )
  }

  return (
    <div
      id={listId}
      className={cn(box, "flex items-start gap-2")}
    >
      <span
        className={cn(
          "flex shrink-0 -space-x-2 py-px",
          // The names need the width of the narrow row on a phone more.
          variant === "line" && "max-sm:hidden",
        )}
      >
        {named.map((friend) => (
          <PersonAvatar
            key={friend.id}
            name={friend.name}
            photo={friend.image}
            size="sm"
            className={cn("ring-2", variant === "band" ? "ring-accent" : "ring-background")}
          />
        ))}
      </span>
      <p className="min-w-0 break-words">
        {label}{" "}
        {named.map((friend, index) => (
          <Fragment key={friend.id}>
            {profileLink(friend)}
            {index === named.length - 1
              ? null
              : index === named.length - 2 && others === 0
                ? ` ${t("events.friends.and")} `
                : ", "}
          </Fragment>
        ))}
        {others > 0 ? <> {toggle}</> : null}
      </p>
    </div>
  )
}

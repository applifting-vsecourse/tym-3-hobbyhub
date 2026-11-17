import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"

type PersonCardProps = {
  person: { id: string; name: string; image: string | null }
  /** A line under the name, e.g. since when we are friends. */
  detail?: string
  /** Something to read beside the name, e.g. the relation badge. */
  aside?: ReactNode
  /** A button of its own (#226: "Odebrat z přátel"); it sits above the link. */
  action?: ReactNode
}

/**
 * A person in the friends list and the search: the whole card leads to their
 * profile. The link stretches over the card instead of wrapping it, so the
 * card can hold a button of its own next to it.
 */
export function PersonCard({ person, detail, aside, action }: PersonCardProps) {
  return (
    <div className="relative flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring has-[a:hover]:bg-accent">
      <PersonAvatar
        name={person.name}
        photo={person.image}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <Link
          to="/profile/$userId"
          params={{ userId: person.id }}
          className="typo-title break-words text-foreground outline-none after:absolute after:inset-0 after:rounded-lg"
        >
          {person.name}
        </Link>
        {detail ? (
          <span className="typo-small break-words text-muted-foreground">{detail}</span>
        ) : null}
      </span>
      {aside}
      {action}
    </div>
  )
}

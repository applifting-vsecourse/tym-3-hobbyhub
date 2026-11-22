import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { FriendsGoing } from "@/components/hobbyhub/FriendsGoing"
import { RatingScore } from "@/components/hobbyhub/RatingScore"
import { CardFoot, type LandingCardBase } from "@/components/hobbyhub/TicketCard"
import { cn } from "@/lib/utils"

export type OrganizerCardProps = LandingCardBase & {
  /** Day and time, e.g. "so 21. 11. · 9:00". */
  when: string
  organizerName: string
  /**
   * The organizer's public score; null when there is none to show, or the
   * viewer may not see it (a visitor, visibility matrix): then just the name.
   */
  organizerScore?: { average: number | null; count: number | null } | null
  /** Without a photo the card shows the activity's icon on a muted band. */
  photo?: { src: string; alt: string }
}

/**
 * Organizátor (#215) — the card of "Top akce": trust at a glance, who runs
 * the event and how people rate them, above the event itself.
 */
export function OrganizerCard({
  title,
  when,
  organizerName,
  organizerScore = null,
  photo,
  activity,
  taken,
  min,
  max,
  friends = [],
  viewerState = null,
  className,
}: OrganizerCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      {photo ? (
        <img
          src={photo.src}
          alt={photo.alt}
          className="h-28 w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-28 w-full items-center justify-center bg-muted text-muted-foreground"
        >
          {activity && isActivityKey(activity) ? (
            <ActivityIcon
              activity={activity}
              className="size-8"
            />
          ) : null}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="typo-label text-foreground">{organizerName}</span>
          {organizerScore?.average != null ? (
            <RatingScore
              average={organizerScore.average}
              count={organizerScore.count}
            />
          ) : null}
        </div>
        <h3 className="line-clamp-2 typo-title text-foreground">{title}</h3>
        <p className="typo-small text-muted-foreground">{when}</p>
        <FriendsGoing friends={friends} />
        <CardFoot
          taken={taken}
          min={min}
          max={max}
          viewerState={viewerState}
        />
      </div>
    </article>
  )
}

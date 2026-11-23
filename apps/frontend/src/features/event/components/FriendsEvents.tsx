import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { Button } from "@/components/ui/button"

import type { EventListItem, FriendsEvent } from "@/features/event/api/eventSchemas"
import { friendsEventsQueryOptions } from "@/features/event/api/friendsEventsQueryOptions"
import { EventsLoadError } from "@/features/event/components/EventsLoadError"
import { FriendsOnEvent } from "@/features/event/components/FriendsOnEvent"
import { eventClock, eventDate, eventMeta } from "@/features/event/lib/eventLabels"

/** #226: how many of the nearest events stand above the friends list. */
export const FRIENDS_EVENTS_PREVIEW = 3

type FriendsEventsProps = {
  /** Who is signed in: the friends are theirs. */
  viewerId: string
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

/**
 * Akce přátel (#226): the upcoming events my friends go to or organize,
 * soonest first, 10 at a time. Each once, with which of my friends are there.
 */
export function FriendsEvents({ viewerId, activityLabel, now = new Date() }: FriendsEventsProps) {
  const { t } = useTranslation()
  const query = useInfiniteQuery(friendsEventsQueryOptions(viewerId))
  const items = query.data?.pages.flatMap((page) => page.items)

  if (query.isPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader
          variant="ball"
          label={t("events.friendsEvents.loading")}
        />
      </div>
    )
  }
  // A failed next page keeps the loaded ones; only a first load fails here.
  if (query.isError && !items) {
    return (
      <EventsLoadError
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  }
  if (!items || items.length === 0) {
    return <p className="typo-body text-muted-foreground">{t("events.friendsEvents.empty")}</p>
  }
  return (
    <>
      <FriendsEventRows
        items={items}
        activityLabel={activityLabel}
        now={now}
        label={t("events.friendsEvents.list")}
      />
      {query.hasNextPage ? (
        <div className="flex flex-col items-center gap-2">
          {query.isFetchNextPageError ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("events.friendsEvents.loadMoreError")}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("events.friendsEvents.loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  )
}

/**
 * „Kam jdou přátelé“ (#226) above the friends list: the three nearest events
 * of „Akce přátel“ and the way there. Not there at all while nothing is
 * planned, or when it did not load: the friends below matter more.
 */
export function FriendsEventsPreview({
  viewerId,
  activityLabel,
  now = new Date(),
}: FriendsEventsProps) {
  const { t } = useTranslation()
  const query = useInfiniteQuery(friendsEventsQueryOptions(viewerId))
  const items = query.data?.pages[0]?.items.slice(0, FRIENDS_EVENTS_PREVIEW) ?? []
  if (items.length === 0) return null

  return (
    <section
      aria-labelledby="friends-events-preview"
      className="flex flex-col gap-1"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2
          id="friends-events-preview"
          className="typo-h3 text-foreground"
        >
          {t("events.friendsEvents.previewTitle")}
        </h2>
        <Button
          asChild
          variant="link"
          className="h-11 px-0 md:h-9"
        >
          <Link
            to={ROUTES.friends}
            search={{ tab: "events" }}
          >
            {t("events.friendsEvents.all")}
          </Link>
        </Button>
      </div>
      <FriendsEventRows
        items={items}
        activityLabel={activityLabel}
        now={now}
        label={t("events.friendsEvents.previewTitle")}
      />
    </section>
  )
}

function FriendsEventRows({
  items,
  activityLabel,
  now,
  label,
}: {
  items: FriendsEvent[]
  activityLabel: FriendsEventsProps["activityLabel"]
  now: Date
  label: string
}) {
  const { t, i18n } = useTranslation()

  return (
    <ul aria-label={label}>
      {items.map(({ event, friends }) => (
        // The link to the event stretches over the row instead of wrapping
        // it: the friends' names in the row lead to their profiles.
        <li
          key={event.id}
          className="relative -mx-3 rounded-lg px-3 transition-colors has-[>a:focus-visible]:ring-[3px] has-[>a:focus-visible]:ring-ring/50 has-[>a:hover]:bg-muted"
        >
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            aria-label={event.title}
            className="absolute inset-0 rounded-lg outline-none"
          />
          <ScheduleRow
            day={eventDate(t, event.startAt, now, i18n.language)}
            time={eventClock(t, event.startAt, now, i18n.language)}
            title={event.title}
            subtitle={eventMeta(t, event, activityLabel(event.activity))}
            taken={event.takenCount}
            min={event.minParticipants}
            max={event.maxParticipants}
            // The title next to it says what the photo shows.
            photo={event.imageUrl ? { src: event.imageUrl, alt: "" } : undefined}
            activity={event.activity.icon}
            badge={
              <FriendsOnEvent
                friends={friends}
                period="upcoming"
                variant="line"
              />
            }
          />
        </li>
      ))}
    </ul>
  )
}

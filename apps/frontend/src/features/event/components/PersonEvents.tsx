import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { Button } from "@/components/ui/button"
import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import {
  personEventPageSchema,
  type EventListItem,
  type GroupEventPeriod,
  type PersonEventPage,
} from "@/features/event/api/eventSchemas"
import { personEventsQueryOptions } from "@/features/event/api/friendsEventsQueryOptions"
import { eventClock, eventDate, eventMeta } from "@/features/event/lib/eventLabels"

type PersonEventsProps = {
  /** Whose profile this is. */
  userId: string
  /**
   * The first page of each part the friend lets friends see, as the profile
   * brought it (read here, where its shape is known); a part they do not
   * share is absent, and so is its tab.
   */
  pages: Partial<Record<GroupEventPeriod, unknown>>
  /** When the profile loaded, so its pages count as fresh as it is. */
  loadedAt: number
  /** The part in the address; the upcoming one by default. */
  period: GroupEventPeriod
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

/**
 * Akce (#226) on a friend's profile: their upcoming events and the past ones,
 * each part only when they let friends see it. Two tabs when both are there;
 * 10 at a time with "Načíst další".
 */
export function PersonEvents({
  userId,
  pages,
  loadedAt,
  period,
  activityLabel,
  now = new Date(),
}: PersonEventsProps) {
  const { t } = useTranslation()
  const read = {
    upcoming: personEventPageSchema.safeParse(pages.upcoming).data,
    past: personEventPageSchema.safeParse(pages.past).data,
  }
  const periods = (["upcoming", "past"] as const).filter((each) => read[each])
  const shown = read[period] ? period : periods[0]
  const firstPage = shown ? read[shown] : undefined
  if (!shown || !firstPage) return null

  return (
    <section
      aria-labelledby="person-events-heading"
      className="flex flex-col gap-3 border-t border-border pt-6"
    >
      <h2
        id="person-events-heading"
        className="typo-h3 text-foreground"
      >
        {periods.length > 1
          ? t("events.personEvents.title")
          : t(`events.personEvents.only.${shown}`)}
      </h2>
      {periods.length > 1 ? (
        <nav
          aria-label={t("events.personEvents.periodsLabel")}
          className="flex gap-2"
        >
          {periods.map((each) => {
            const isActive = each === shown
            return (
              <Link
                key={each}
                to="/profile/$userId"
                params={{ userId }}
                search={each === "upcoming" ? {} : { events: each }}
                // The list changes, the page does not move.
                resetScroll={false}
                replace
                aria-current={isActive ? "page" : undefined}
                data-state={isActive ? "on" : "off"}
                className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
              >
                {t(`events.personEvents.periods.${each}`)}
              </Link>
            )
          })}
        </nav>
      ) : null}
      <PersonEventList
        // A part of its own: switching does not carry the other's pages.
        key={shown}
        userId={userId}
        period={shown}
        firstPage={firstPage}
        loadedAt={loadedAt}
        activityLabel={activityLabel}
        now={now}
      />
    </section>
  )
}

function PersonEventList({
  userId,
  period,
  firstPage,
  loadedAt,
  activityLabel,
  now,
}: {
  userId: string
  period: GroupEventPeriod
  firstPage: PersonEventPage
  loadedAt: number
  activityLabel: PersonEventsProps["activityLabel"]
  now: Date
}) {
  const { t, i18n } = useTranslation()
  const query = useInfiniteQuery(
    personEventsQueryOptions(userId, period, { page: firstPage, loadedAt }),
  )
  const events = query.data.pages.flatMap((page) => page.items)

  if (events.length === 0) {
    return (
      <p className="typo-body text-muted-foreground">{t(`events.personEvents.empty.${period}`)}</p>
    )
  }
  return (
    <>
      <ul aria-label={t(`events.personEvents.periods.${period}`)}>
        {events.map((event) => (
          <li key={event.id}>
            <Link
              to="/events/$eventId"
              params={{ eventId: event.id }}
              className="-mx-3 block rounded-lg px-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
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
              />
            </Link>
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto sm:self-start"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("events.personEvents.loadMore")}
        </Button>
      ) : null}
      {query.isFetchNextPageError ? (
        <p
          role="alert"
          className="typo-small text-destructive"
        >
          {t("events.personEvents.loadMoreError")}
        </p>
      ) : null}
    </>
  )
}

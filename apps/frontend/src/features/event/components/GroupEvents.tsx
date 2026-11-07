import { Link } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"
import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import {
  GROUP_EVENT_PERIODS,
  type GroupEvent,
  type GroupEventPeriod,
} from "@/features/event/api/eventSchemas"
import { EventsLoadError } from "@/features/event/components/EventsLoadError"
import { eventDay, eventMeta, eventTime } from "@/features/event/lib/eventLabels"

type GroupEventsProps = {
  groupId: string
  period: GroupEventPeriod
  /** Members see the past too, and get the switch between the two (F-07.2). */
  isMember: boolean
  events: GroupEvent[]
  /** All the events of the period, which can be more than the ones loaded. */
  total: number
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: GroupEvent["activity"]) => string
  isLoading: boolean
  error: Error | null
  onReload: () => void
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

/**
 * Akce skupiny (F-07.2) on the group page: its upcoming events for everyone
 * who may see the group, and for its members the group-only ones and the
 * past. The period lives in the URL, so a link keeps it.
 */
export function GroupEvents({
  groupId,
  period,
  isMember,
  events,
  total,
  activityLabel,
  isLoading,
  error,
  onReload,
  hasMore,
  isLoadingMore,
  onLoadMore,
  now = new Date(),
}: GroupEventsProps) {
  const { t, i18n } = useTranslation()

  let body
  if (isLoading) {
    body = (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t("groups.detail.events.loading")}
        />
      </div>
    )
  } else if (error && events.length === 0) {
    // A failed refetch in the background keeps the rows; only a first load fails here.
    body = (
      <EventsLoadError
        error={error}
        onRetry={onReload}
      />
    )
  } else if (events.length === 0) {
    body = (
      <p className="typo-body text-muted-foreground">{t(`groups.detail.events.empty.${period}`)}</p>
    )
  } else {
    body = (
      <>
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <Link
                to="/events/$eventId"
                params={{ eventId: event.id }}
                className="-mx-3 block rounded-lg px-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <ScheduleRow
                  time={eventTime(event.startAt, i18n.language)}
                  title={event.title}
                  subtitle={[
                    eventDay(t, event.startAt, now, i18n.language),
                    eventMeta(t, event, activityLabel(event.activity)),
                  ].join(" · ")}
                  taken={event.takenCount}
                  min={event.minParticipants}
                  max={event.maxParticipants}
                  // The title next to it says what the photo shows.
                  photo={event.imageUrl ? { src: event.imageUrl, alt: "" } : undefined}
                  activity={event.activity.icon}
                  badge={
                    event.status === "CANCELLED" || event.visibility === "GROUP_ONLY" ? (
                      <GroupEventBadges event={event} />
                    ) : undefined
                  }
                />
              </Link>
            </li>
          ))}
        </ul>
        {hasMore ? (
          <Button
            variant="outline"
            className="w-full sm:w-auto sm:self-start"
            disabled={isLoadingMore}
            onClick={onLoadMore}
          >
            {isLoadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("groups.detail.events.loadMore")}
          </Button>
        ) : null}
        {error && hasMore ? (
          <p
            role="alert"
            className="typo-small text-destructive"
          >
            {t("groups.detail.events.loadMoreFailed")}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <section
      aria-labelledby="group-events-heading"
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <h2
        id="group-events-heading"
        className="typo-h3 text-foreground"
      >
        {t("groups.detail.events.title")}
      </h2>
      {isMember ? (
        <nav
          aria-label={t("groups.detail.events.periodsLabel")}
          className="flex gap-2"
        >
          {GROUP_EVENT_PERIODS.map((each) => {
            const isActive = each === period
            return (
              <Link
                key={each}
                to="/groups/$groupId"
                params={{ groupId }}
                search={each === "upcoming" ? {} : { events: each }}
                // The list moves, the page does not.
                resetScroll={false}
                aria-current={isActive ? "page" : undefined}
                data-state={isActive ? "on" : "off"}
                className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
              >
                {t(`groups.detail.events.periods.${each}`)}
              </Link>
            )
          })}
        </nav>
      ) : null}
      {!isLoading && !(error && events.length === 0) && events.length > 0 ? (
        <p className="typo-small text-muted-foreground">
          {t(`groups.detail.events.count.${period}`, { count: total })}
        </p>
      ) : null}
      {body}
    </section>
  )
}

/** "Jen pro skupinu" and "Zrušeno": what sets a row apart from a plain public event. */
function GroupEventBadges({ event }: { event: GroupEvent }) {
  const { t } = useTranslation()
  const isCancelled = event.status === "CANCELLED"
  const isGroupOnly = event.visibility === "GROUP_ONLY"
  return (
    <div className="flex flex-wrap gap-1.5">
      {isCancelled ? (
        <StatusBadge status="rejected">{t("groups.detail.events.cancelled")}</StatusBadge>
      ) : null}
      {isGroupOnly ? (
        <StatusBadge status="neutral">{t("groups.detail.events.groupOnly")}</StatusBadge>
      ) : null}
    </div>
  )
}

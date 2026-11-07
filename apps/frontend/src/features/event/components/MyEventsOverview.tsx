import { useEffect, useRef, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { StatusBadge, type Status } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import type { ApplicationStatus, MyApplication } from "@/features/event/api/myEventsSchemas"
import { EventsLoadError } from "@/features/event/components/EventsLoadError"
import { NoMatchingEvents } from "@/features/event/components/NoMatchingEvents"
import { eventDay, eventMeta, eventTime } from "@/features/event/lib/eventLabels"

const BADGES: Record<ApplicationStatus, Status> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  WITHDRAWN: "neutral",
  EVENT_CANCELLED: "rejected",
}

/** The two lists of the overview; the first one has no param in the URL. */
export type MyEventsTab = "applications" | "hosted"

/** What the overview needs to know about one of its two lists. */
export type MyEventsList<T> = {
  items: T[]
  /** All rows that match the filter, which can be more than the ones loaded. */
  total: number
  isLoading: boolean
  /** The rows are those of the previous filter while the new ones load. */
  isStale?: boolean
  error: Error | null
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  onReload: () => void
  /** Retries what failed after rows were loaded: the next page or a reload. */
  onRetry: () => void
}

type MyEventsOverviewProps = {
  applications: MyEventsList<MyApplication>
  hosted: MyEventsList<EventListItem>
  /** The list on screen, from the URL. */
  tab: MyEventsTab
  /** Search and filters of both lists, shown under the tabs. */
  filters?: ReactNode
  /** Some filter is on, so an empty list means "nothing matches", not "nothing yet". */
  isFiltered?: boolean
  onClearFilters?: () => void
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

/** The next page loads by itself when the button scrolls into view; the button also works alone. */
function LoadMore({ isLoading, onLoadMore }: { isLoading: boolean; onLoadMore: () => void }) {
  const { t } = useTranslation()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // The observer outlives renders; it always calls the latest callback.
  const onLoadMoreRef = useRef(onLoadMore)
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  })

  useEffect(() => {
    const button = buttonRef.current
    if (!button || isLoading || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMoreRef.current()
    })
    observer.observe(button)
    return () => observer.disconnect()
  }, [isLoading])

  return (
    <Button
      ref={buttonRef}
      variant="outline"
      className="mt-4 self-center"
      disabled={isLoading}
      onClick={onLoadMore}
    >
      {t("myEvents.loadMore")}
    </Button>
  )
}

/**
 * "Přihlášky" / "Pořádám": links, because the tab lives in the URL
 * (`/my-events`, `/my-events?tab=hosted`). Switching keeps the filters.
 */
function MyEventsTabs({
  active,
  labels,
}: {
  active: MyEventsTab
  labels: Record<MyEventsTab, string>
}) {
  const { t } = useTranslation()

  return (
    <PageTabs label={t("myEvents.tabs.label")}>
      <PageTab
        to="/my-events"
        search={(previous) => ({ ...previous, tab: undefined })}
        isActive={active === "applications"}
      >
        {labels.applications}
      </PageTab>
      <PageTab
        to="/my-events"
        search={(previous) => ({ ...previous, tab: "hosted" as const })}
        isActive={active === "hosted"}
      >
        {labels.hosted}
      </PageTab>
    </PageTabs>
  )
}

/**
 * F-06.3, #177: the person's applications with their state, and the events
 * they organize — what is still on first, then the rest — with the search and
 * filters of the event list.
 */
export function MyEventsOverview({
  applications,
  hosted,
  tab,
  filters,
  isFiltered = false,
  onClearFilters,
  activityLabel,
  now = new Date(),
}: MyEventsOverviewProps) {
  const { t, i18n } = useTranslation()

  if (applications.isLoading && hosted.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader
          variant="player"
          label={t("myEvents.loading")}
        />
      </div>
    )
  }

  const isNothingYet =
    !isFiltered &&
    !applications.error &&
    !hosted.error &&
    !applications.isLoading &&
    !hosted.isLoading &&
    applications.total === 0 &&
    hosted.total === 0
  if (isNothingYet) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3"
      >
        <h2 className="typo-h3 text-foreground">{t("myEvents.empty.title")}</h2>
        <p className="typo-body text-muted-foreground">{t("myEvents.empty.description")}</p>
        <Button
          asChild
          className="w-full sm:w-auto"
        >
          <Link to={ROUTES.events}>{t("myEvents.empty.find")}</Link>
        </Button>
      </div>
    )
  }

  const row = (event: EventListItem, status?: ApplicationStatus) => (
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
            status ? (
              <StatusBadge status={BADGES[status]}>{t(`myEvents.status.${status}`)}</StatusBadge>
            ) : undefined
          }
        />
      </Link>
    </li>
  )

  // One tab's body: loading, a failed first load, the rows with "load more", or "nothing here".
  const body = <T,>(
    list: MyEventsList<T>,
    emptyKey: "myEvents.applications.empty" | "myEvents.hosted.empty",
    render: (item: T) => React.ReactNode,
  ) => {
    if (list.isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader
            variant="player"
            label={t("myEvents.loading")}
          />
        </div>
      )
    }
    if (list.error && list.items.length === 0) {
      return (
        <EventsLoadError
          error={list.error}
          onRetry={list.onReload}
        />
      )
    }
    if (list.items.length === 0) {
      return isFiltered ? (
        <NoMatchingEvents onClearFilters={onClearFilters} />
      ) : (
        <p className="typo-body text-muted-foreground">{t(emptyKey)}</p>
      )
    }
    return (
      <div className="flex flex-col">
        <ul>{list.items.map(render)}</ul>
        {list.error ? (
          // A later page or a reload failed: keep what is loaded and retry just that.
          <EventsLoadError
            error={list.error}
            onRetry={list.onRetry}
          />
        ) : list.hasMore ? (
          <LoadMore
            isLoading={list.isLoadingMore}
            onLoadMore={list.onLoadMore}
          />
        ) : null}
      </div>
    )
  }

  const label = (list: MyEventsList<unknown>, key: "applications" | "hosted") =>
    list.isLoading
      ? t(`myEvents.tabs.${key}`)
      : t(`myEvents.tabs.${key}WithCount`, { count: list.total })

  const active = tab === "hosted" ? hosted : applications

  return (
    <div className="flex flex-col gap-6">
      <MyEventsTabs
        active={tab}
        labels={{
          applications: label(applications, "applications"),
          hosted: label(hosted, "hosted"),
        }}
      />
      {filters}
      <div
        aria-busy={active.isStale}
        // The previous list stays until the new one arrives; show that it is stale.
        className={cn(active.isStale && "opacity-60 transition-opacity")}
      >
        {tab === "hosted"
          ? body(hosted, "myEvents.hosted.empty", (event) => row(event))
          : body(applications, "myEvents.applications.empty", ({ event, status }) =>
              row(event, status),
            )}
      </div>
    </div>
  )
}

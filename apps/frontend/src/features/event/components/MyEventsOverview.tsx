import { useEffect, useRef, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import type { ParseKeys } from "i18next"
import { Ellipsis } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { StatusBadge, type Status } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import type {
  ApplicationStatus,
  HostedEvent,
  MyApplication,
} from "@/features/event/api/myEventsSchemas"
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

/**
 * The one way out of an application, offered in the row's menu (#171):
 * withdrawing a request the organizer has not decided, or cancelling a seat.
 */
export type ApplicationAction = "withdraw" | "cancel"

/** Only while the event has not started: after that the server would refuse both. */
export function applicationActionOf(
  { status, event }: MyApplication,
  now: Date,
): ApplicationAction | null {
  if (event.startAt <= now) return null
  if (status === "PENDING") return "withdraw"
  if (status === "APPROVED") return "cancel"
  return null
}

/** Translation keys of the menu items; a renamed key fails the type-check. */
const ACTION_LABELS = {
  withdraw: "participationRequests.pending.withdraw",
  cancel: "participationRequests.approved.cancel",
} as const satisfies Record<ApplicationAction, ParseKeys>

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
  /** The organizer's own events; `isHidden` marks one an administrator hid (#239). */
  hosted: MyEventsList<EventListItem & Partial<Pick<HostedEvent, "isHidden">>>
  /** The list on screen, from the URL. */
  tab: MyEventsTab
  /** Search and filters of both lists, shown under the tabs. */
  filters?: ReactNode
  /** Some filter is on, so an empty list means "nothing matches", not "nothing yet". */
  isFiltered?: boolean
  onClearFilters?: () => void
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  /**
   * Opens the dialog for the row's action, which the page owns (#171). Without
   * it the rows have no menu.
   */
  onApplicationAction?: (action: ApplicationAction, application: MyApplication) => void
  /**
   * Injectable so "today" is stable in tests. Without it the overview renews
   * the time every minute, so a page left open stops offering an action once
   * its event starts.
   */
  now?: Date
}

/**
 * The row's menu with its one action. The dialog opens only once the menu has
 * closed and handed focus back to its button: opened from `onSelect`, the
 * closing menu and the opening dialog fight over focus and the body's
 * `pointer-events`, which can leave the page unclickable. Non-modal, the menu
 * does not lock the page at all, so nothing is left to restore.
 */
function ApplicationActionMenu({
  application,
  action,
  onAction,
}: {
  application: MyApplication
  action: ApplicationAction
  onAction: (action: ApplicationAction, application: MyApplication) => void
}) {
  const { t } = useTranslation()
  const isChosenRef = useRef(false)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t("myEvents.actions.label", { title: application.event.title })}
        >
          <Ellipsis className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={() => {
          // Runs once the menu is gone, as focus goes back to its button, so
          // the dialog returns focus to the button when it closes.
          if (!isChosenRef.current) return
          isChosenRef.current = false
          onAction(action, application)
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            isChosenRef.current = true
          }}
        >
          {t(ACTION_LABELS[action])}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
  onApplicationAction,
  now: fixedNow,
}: MyEventsOverviewProps) {
  const { t, i18n } = useTranslation()
  const tickingNow = useNow()
  const now = fixedNow ?? tickingNow

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

  const row = (
    event: EventListItem & Partial<Pick<HostedEvent, "isHidden">>,
    application?: MyApplication,
  ) => {
    const status = application?.status
    const action = application && onApplicationAction ? applicationActionOf(application, now) : null
    return (
      // The row's top line runs under the menu too; the menu sits centred
      // beside the row whatever its height.
      <li
        key={event.id}
        className="flex items-center gap-1 border-t border-border"
      >
        <Link
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className="-ml-3 block min-w-0 flex-1 rounded-lg pr-1 pl-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
            className="border-t-0"
            badge={
              status ? (
                <StatusBadge status={BADGES[status]}>{t(`myEvents.status.${status}`)}</StatusBadge>
              ) : event.isHidden ? (
                // #239: only the organizer still sees it; the detail says why.
                <StatusBadge status="neutral">{t("myEvents.hidden")}</StatusBadge>
              ) : undefined
            }
          />
        </Link>
        {/* Next to the link, not inside it: a button in an anchor is not valid
            HTML, and a tap on it must not open the detail. */}
        {application && action && onApplicationAction ? (
          <ApplicationActionMenu
            application={application}
            action={action}
            onAction={onApplicationAction}
          />
        ) : application && onApplicationAction ? (
          // A row without an action (decided, or already over) keeps the
          // menu's room, so the seats stay in one column down the list (#177).
          <span
            aria-hidden
            className="size-11 shrink-0"
          />
        ) : null}
      </li>
    )
  }

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
          : body(applications, "myEvents.applications.empty", (application) =>
              row(application.event, application),
            )}
      </div>
    </div>
  )
}

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
  InterestedEvent,
  MyApplication,
} from "@/features/event/api/myEventsSchemas"
import { EventsLoadError } from "@/features/event/components/EventsLoadError"
import { NoMatchingEvents } from "@/features/event/components/NoMatchingEvents"
import {
  eventClock,
  eventDate,
  eventHostAndPrice,
  eventMeta,
  eventPrice,
} from "@/features/event/lib/eventLabels"

const BADGES: Record<ApplicationStatus, Status> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  WITHDRAWN: "neutral",
  EVENT_CANCELLED: "rejected",
}

/** The lists of the overview; the first one has no param in the URL. */
export type MyEventsTab = "applications" | "hosted" | "interested"

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
  hosted: MyEventsList<
    EventListItem & Partial<Pick<HostedEvent, "isHidden" | "participantsToRate">>
  >
  /**
   * #231: the events on the person's "Zajímá mě" list, what is still on first.
   * Rows on their way out (removed, the toast still offering "Vrátit") are
   * already left out, and `total` no longer counts them.
   */
  interested: MyEventsList<InterestedEvent>
  /** Takes an event off the "Zajímá mě" list; the page offers the way back. */
  onRemoveInterest?: (event: InterestedEvent) => void
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
 * The row's menu with the one thing the row offers: its way out before the
 * event starts (#171), or the rating of the organizer once it is over (#234).
 * Never both: the first ends where the second begins.
 *
 * The dialog of an action opens only once the menu has closed and handed focus
 * back to its button: opened from `onSelect`, the closing menu and the opening
 * dialog fight over focus and the body's `pointer-events`, which can leave the
 * page unclickable. Non-modal, the menu does not lock the page at all, so
 * nothing is left to restore. The rating is a page, so its item is a link.
 */
function ApplicationActionMenu({
  application,
  action,
  onAction,
}: {
  application: MyApplication
  action: ApplicationAction | null
  onAction?: (action: ApplicationAction, application: MyApplication) => void
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
          if (!isChosenRef.current || !action) return
          isChosenRef.current = false
          onAction?.(action, application)
        }}
      >
        {action ? (
          <DropdownMenuItem
            onSelect={() => {
              isChosenRef.current = true
            }}
          >
            {t(ACTION_LABELS[action])}
          </DropdownMenuItem>
        ) : null}
        {application.canRateOrganizer ? (
          <DropdownMenuItem asChild>
            <Link
              to="/events/$eventId/ratings"
              params={{ eventId: application.event.id }}
            >
              {t("myEvents.rate")}
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * #235: the menu of an event the person organized, while they may still rate
 * its participants. The rating is a page, so its item is a link.
 */
function RateParticipantsMenu({ event }: { event: EventListItem }) {
  const { t } = useTranslation()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t("myEvents.actions.hostedLabel", { title: event.title })}
        >
          <Ellipsis className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link
            to="/events/$eventId/ratings"
            params={{ eventId: event.id }}
          >
            {t("myEvents.rateParticipants")}
          </Link>
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
 * "Přihlášky" / "Pořádám" / "Zajímá mě": links, because the tab lives in the
 * URL (`/my-events`, `?tab=hosted`, `?tab=interested`). Switching keeps the
 * filters.
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
      <PageTab
        to="/my-events"
        search={(previous) => ({ ...previous, tab: "interested" as const })}
        isActive={active === "interested"}
      >
        {labels.interested}
      </PageTab>
    </PageTabs>
  )
}

/** #231: what the "Zajímá mě" list is for, while nothing is on it. */
function InterestedEmpty() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-start gap-3">
      <h2 className="typo-h3 text-foreground">{t("myEvents.interested.empty.title")}</h2>
      <p className="max-w-prose typo-body text-muted-foreground">
        {t("myEvents.interested.empty.description")}
      </p>
      <Button
        asChild
        variant="outline"
        className="w-full sm:w-auto"
      >
        <Link to={ROUTES.events}>{t("myEvents.interested.empty.find")}</Link>
      </Button>
    </div>
  )
}

/**
 * #231: where a saved event stands, under its title. Still on: whether it can
 * be joined (full, or how many seats are left), or that it is under way. Over
 * or called off: just that.
 */
function InterestedBadge({ event, now }: { event: InterestedEvent; now: Date }) {
  const { t } = useTranslation()

  if (event.state === "CANCELLED") {
    return <StatusBadge status="rejected">{t("myEvents.interested.state.CANCELLED")}</StatusBadge>
  }
  if (event.state === "PAST") {
    return <StatusBadge status="neutral">{t("myEvents.interested.state.PAST")}</StatusBadge>
  }
  if (event.startAt <= now) {
    return <StatusBadge status="neutral">{t("myEvents.interested.state.STARTED")}</StatusBadge>
  }
  const free = event.maxParticipants - event.takenCount
  return free > 0 ? (
    <StatusBadge status="neutral">
      {t("myEvents.interested.freeSpots", { count: free })}
    </StatusBadge>
  ) : (
    <StatusBadge status="approved">{t("myEvents.interested.full")}</StatusBadge>
  )
}

/** #231: the one thing a saved event's row offers, taking it off the list. */
function InterestedRowMenu({
  event,
  onRemove,
}: {
  event: InterestedEvent
  onRemove: (event: InterestedEvent) => void
}) {
  const { t } = useTranslation()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t("myEvents.interested.actionsLabel", { title: event.title })}
        >
          <Ellipsis className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onRemove(event)}>
          {t("myEvents.interested.remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * #231: the saved events, the ones still on first; what is over or was called
 * off sits apart under its own heading, quieter, and can still be opened and
 * taken off the list.
 */
function InterestedEvents({
  events,
  now,
  activityLabel,
  onRemove,
}: {
  events: InterestedEvent[]
  now: Date
  activityLabel: (activity: EventListItem["activity"]) => string
  onRemove?: (event: InterestedEvent) => void
}) {
  const { t, i18n } = useTranslation()
  const upcoming = events.filter((event) => event.state === "UPCOMING")
  const past = events.filter((event) => event.state !== "UPCOMING")

  const row = (event: InterestedEvent) => (
    <li
      key={event.id}
      className="flex items-center gap-1 border-t border-border"
    >
      <Link
        to="/events/$eventId"
        params={{ eventId: event.id }}
        className={cn(
          "-ml-3 block min-w-0 flex-1 rounded-lg pr-1 pl-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50",
          event.state !== "UPCOMING" && "opacity-60",
        )}
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
          details={eventHostAndPrice(t, event, i18n.language)}
          className="border-t-0"
          badge={
            <InterestedBadge
              event={event}
              now={now}
            />
          }
        />
      </Link>
      {/* Next to the link, not inside it: a button in an anchor is not valid HTML. */}
      {onRemove ? (
        <InterestedRowMenu
          event={event}
          onRemove={onRemove}
        />
      ) : null}
    </li>
  )

  return (
    <div className="flex flex-col gap-8">
      {upcoming.length > 0 ? <ul>{upcoming.map(row)}</ul> : null}
      {past.length > 0 ? (
        <section
          aria-labelledby="interested-past-heading"
          className="flex flex-col gap-3"
        >
          <h2
            id="interested-past-heading"
            className="typo-h3 text-foreground"
          >
            {t("myEvents.interested.pastHeading")}
          </h2>
          <ul>{past.map(row)}</ul>
        </section>
      ) : null}
    </div>
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
  interested,
  onRemoveInterest,
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

  if (applications.isLoading && hosted.isLoading && interested.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader
          variant="player"
          label={t("myEvents.loading")}
        />
      </div>
    )
  }

  // The "Zajímá mě" tab explains itself when it is empty (#231), so a link to
  // it never lands on the overview's general "nothing here".
  const isNothingYet =
    tab !== "interested" &&
    !isFiltered &&
    [applications, hosted, interested].every(
      (list) => !list.error && !list.isLoading && list.total === 0,
    )
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

  // #235: once one of the organizer's rows has a menu, the others keep its
  // room, so the seats stay in one column down the list.
  const hasHostedMenu = hosted.items.some((event) => (event.participantsToRate ?? 0) > 0)

  const row = (
    event: EventListItem & Partial<Pick<HostedEvent, "isHidden" | "participantsToRate">>,
    application?: MyApplication,
  ) => {
    const status = application?.status
    const isToRate = !application && (event.participantsToRate ?? 0) > 0
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
            // Who runs it says nothing new on the person's own events.
            details={
              application
                ? eventHostAndPrice(t, event, i18n.language)
                : eventPrice(t, event, i18n.language)
            }
            className="border-t-0"
            badge={
              status ? (
                <span className="flex flex-wrap gap-2">
                  <StatusBadge status={BADGES[status]}>
                    {t(`myEvents.status.${status}`)}
                  </StatusBadge>
                  {/* #234: says there is something to do; the menu beside
                      the row does it. */}
                  {application?.canRateOrganizer ? (
                    <StatusBadge status="pending">{t("myEvents.awaitingRating")}</StatusBadge>
                  ) : null}
                </span>
              ) : event.isHidden ? (
                // #239: only the organizer still sees it; the detail says why.
                <StatusBadge status="neutral">{t("myEvents.hidden")}</StatusBadge>
              ) : isToRate ? (
                // #235: something to do; the menu beside the row does it.
                <StatusBadge status="pending">{t("myEvents.awaitingRating")}</StatusBadge>
              ) : undefined
            }
          />
        </Link>
        {/* Next to the link, not inside it: a button in an anchor is not valid
            HTML, and a tap on it must not open the detail. */}
        {application && (action || application.canRateOrganizer) ? (
          <ApplicationActionMenu
            application={application}
            action={action}
            onAction={onApplicationAction}
          />
        ) : isToRate ? (
          <RateParticipantsMenu event={event} />
        ) : (application && onApplicationAction) || (!application && hasHostedMenu) ? (
          // A row with nothing to offer (decided, or over and rated) keeps the
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
  const body = <T,>(list: MyEventsList<T>, empty: ReactNode, render: (items: T[]) => ReactNode) => {
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
      return isFiltered ? <NoMatchingEvents onClearFilters={onClearFilters} /> : empty
    }
    return (
      <div className="flex flex-col">
        {render(list.items)}
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

  const label = (list: MyEventsList<unknown>, key: MyEventsTab) =>
    list.isLoading
      ? t(`myEvents.tabs.${key}`)
      : t(`myEvents.tabs.${key}WithCount`, { count: list.total })

  const active = tab === "hosted" ? hosted : tab === "interested" ? interested : applications

  const emptyText = (key: "myEvents.applications.empty" | "myEvents.hosted.empty") => (
    <p className="typo-body text-muted-foreground">{t(key)}</p>
  )

  return (
    <div className="flex flex-col gap-6">
      <MyEventsTabs
        active={tab}
        labels={{
          applications: label(applications, "applications"),
          hosted: label(hosted, "hosted"),
          interested: label(interested, "interested"),
        }}
      />
      {filters}
      <div
        aria-busy={active.isStale}
        // The previous list stays until the new one arrives; show that it is stale.
        className={cn(active.isStale && "opacity-60 transition-opacity")}
      >
        {tab === "hosted"
          ? body(hosted, emptyText("myEvents.hosted.empty"), (events) => (
              <ul>{events.map((event) => row(event))}</ul>
            ))
          : tab === "interested"
            ? body(interested, <InterestedEmpty />, (events) => (
                <InterestedEvents
                  events={events}
                  now={now}
                  activityLabel={activityLabel}
                  onRemove={onRemoveInterest}
                />
              ))
            : body(applications, emptyText("myEvents.applications.empty"), (items) => (
                <ul>{items.map((application) => row(application.event, application))}</ul>
              ))}
      </div>
    </div>
  )
}

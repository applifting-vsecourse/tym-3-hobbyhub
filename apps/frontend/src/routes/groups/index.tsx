import { lazy, Suspense, useState, type ReactNode } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppShell } from "@/app/AppShell"
import { ROUTES } from "@/app/routes"
import type { FiltersSheetField } from "@/components/hobbyhub/FiltersSheet"
import { Loader } from "@/components/hobbyhub/Loader"
import type { EventsView } from "@/components/hobbyhub/ViewToggle"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"
import { useFiltersPanel } from "@/hooks/useFiltersPanel"
import { useSearchText } from "@/hooks/useSearchText"
import { cn } from "@/lib/utils"

import { activityName } from "@/features/activity/activityName"
import { useActivityOptions } from "@/features/activity/hooks/useActivityOptions"
import { useSession } from "@/features/auth/hooks/useSession"
import { EventFiltersBar } from "@/features/event/components/EventFiltersBar"
import {
  EventFiltersPanel,
  isPanelOpen,
  panelFiltersButton,
} from "@/features/event/components/EventFiltersPanel"
import {
  eventsListSearchSchema,
  filtersFromSearch,
  nonEmpty,
  searchWithFilters,
  type EventFilterChange,
} from "@/features/event/lib/eventsSearch"
import { DiscoverGroups } from "@/features/group/components/DiscoverGroups"
import type { ActivityLabel } from "@/features/group/components/GroupCard"
import { GroupTabs } from "@/features/group/components/GroupTabs"
import { MyGroups } from "@/features/group/components/MyGroups"
import { MyMembershipRequests } from "@/features/group/components/MyMembershipRequests"

// Mapbox is large; the list does not wait for it.
const GroupsMap = lazy(() =>
  import("@/features/group/components/GroupsMap").then((module) => ({
    default: module.GroupsMap,
  })),
)

// "Objevit" is always the first tab and the default, so it has no param (like the
// event pages); anything unknown falls back to it. The filters of the list are
// the event list's, minus the dates a group does not have.
const groupsSearchSchema = eventsListSearchSchema
  .pick({
    activity: true,
    q: true,
    location: true,
    place: true,
    placeLat: true,
    placeLng: true,
    radius: true,
  })
  .extend({
    // ADR-0028: the filters only groups have.
    approval: z.enum(["OPEN", "APPROVAL"]).optional().catch(undefined),
    upcoming: z.boolean().optional().catch(undefined),
    sort: z.enum(["newest", "nearest", "members"]).optional().catch(undefined),
    // An old link with ?tab=discover is the same page as no param.
    tab: z
      .enum(["discover", "mine", "requests"])
      .optional()
      .catch(undefined)
      .transform((tab) => (tab === "discover" ? undefined : tab)),
  })

// A group has an activity and a place, no date, price or size; what it adds is
// how it takes people in, an event ahead and the order.
const GROUP_FILTER_FIELDS: FiltersSheetField[] = [
  "activity",
  "place",
  "approval",
  "upcomingEvent",
  "groupSort",
]

export const Route = createFileRoute("/groups/")({
  component: GroupsPage,
  validateSearch: groupsSearchSchema,
})

type GroupsHeaderProps = { /** The page's tabs, for a signed-in viewer. */ tabs?: ReactNode }

// The title, what groups are and the way to a new one; with the tabs under it.
function GroupsHeader({ tabs }: GroupsHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="typo-h1 text-foreground">{t("groups.list.title")}</h1>
          <Button asChild>
            <Link to={ROUTES.newGroup}>{t("groups.list.create")}</Link>
          </Button>
        </div>
        <p className="max-w-prose typo-body text-muted-foreground">{t("groups.list.intro")}</p>
      </div>
      {tabs}
    </div>
  )
}

// "Objevit" with its search and filters in the address. Its own component, so the
// activities for the filter panel are fetched only where the panel is.
function DiscoverTab({
  viewerId,
  activityLabel,
  header,
  view,
  onViewChange,
}: {
  viewerId: string | null
  activityLabel: ActivityLabel
  header: ReactNode
  view: EventsView
  onViewChange: (view: EventsView) => void
}) {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  // The bar and the panel speak the event list's filters; the ones a group does not have stay empty.
  const { filters: eventFilters } = filtersFromSearch(search)
  // The radius is measured from the place picked in the filters (as on the event list, #261).
  const near = eventFilters.place
    ? {
        latitude: eventFilters.place.latitude,
        longitude: eventFilters.place.longitude,
        radiusKm: eventFilters.radiusKm,
      }
    : undefined
  const filters = {
    activityIds: eventFilters.activityIds,
    search: eventFilters.search,
    location: eventFilters.location,
    approvalMode: eventFilters.approvalMode || undefined,
    onlyWithUpcomingEvent: eventFilters.hasUpcomingEvent || undefined,
    near,
    sort: eventFilters.groupSort === "newest" ? undefined : eventFilters.groupSort,
  }
  // The field is what the user typed; the address follows after a pause.
  const [searchText, setSearchText] = useSearchText(
    filters.search,
    (next) =>
      void navigate({
        search: (previous) => ({ ...previous, q: nonEmpty(next) }),
        replace: true,
      }),
  )
  const activityOptions = useActivityOptions()
  const filtersPanel = useFiltersPanel()
  const onFiltersChange = (next: EventFilterChange) =>
    void navigate({ search: (previous) => searchWithFilters(previous, next) })

  return (
    <DiscoverGroups
      viewerId={viewerId}
      activityLabel={activityLabel}
      filters={filters}
      header={header}
      view={view}
      onViewChange={onViewChange}
      renderMap={(groups) => (
        <Suspense
          fallback={
            <div className="flex h-full min-h-72 items-center justify-center rounded-xl bg-muted">
              <Loader
                variant="player"
                label={t("groups.map.loading")}
              />
            </div>
          }
        >
          <GroupsMap
            groups={groups}
            className="size-full"
          />
        </Suspense>
      )}
      // On a large screen the filters are open beside the list (#224).
      filtersPanel={
        <EventFiltersPanel
          filters={eventFilters}
          onFiltersChange={onFiltersChange}
          panel={filtersPanel}
          fields={GROUP_FILTER_FIELDS}
          activityOptions={activityOptions.options}
          activitiesState={activityOptions.state}
          // The order is a field of its own, so the panel needs no note about it.
          sortNote=""
          // Scrolls on its own like the list; the padding keeps the focus rings in view.
          className="-mx-1 min-h-0 overflow-y-auto px-1"
        />
      }
      // The event list's search field and filter chips; groups have no dates.
      filtersBar={
        <EventFiltersBar
          filters={eventFilters}
          isRangeReversed={false}
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onFiltersChange={onFiltersChange}
          onOpenFilters={panelFiltersButton(filtersPanel)}
          shouldShowChips={!isPanelOpen(filtersPanel)}
          activityOptions={activityOptions.options}
          activitiesState={activityOptions.state}
          fields={GROUP_FILTER_FIELDS}
          searchLabel={t("groups.list.searchLabel")}
          searchPlaceholder={t("groups.list.searchPlaceholder")}
          sortNote=""
        />
      }
      onClearFilters={() => {
        setSearchText("")
        void navigate({ search: {} })
      }}
    />
  )
}

// Seznam skupin (F-07.8 #95, #222: laid out like the events). Public: a visitor
// sees the public groups only, without the tabs; "Nová skupina" sends them to
// sign in first.
function GroupsPage() {
  const { t } = useTranslation()
  const { tab = "discover" } = Route.useSearch()
  const { user, isPending: isSessionPending } = useSession()
  const [view, setView] = useState<EventsView>("list")
  const activityLabel: ActivityLabel = (activity) => activityName(t, activity)
  // "Objevit" is one screen like the event list: beside the map the list scrolls on its
  // own, and on a phone the map fills what the filters leave. The other tabs are plain pages.
  const isDiscover = !isSessionPending && (user ? tab === "discover" : true)

  return (
    <>
      <Seo title={t("groups.list.title")} />
      <AppShell
        shellClassName={isDiscover ? cn("lg:h-svh", view === "map" && "max-lg:h-dvh") : undefined}
        className={cn(
          "mx-auto flex w-full max-w-page flex-col gap-6 px-page py-6 md:py-10",
          isDiscover && "lg:min-h-0 lg:overflow-hidden lg:py-6",
          isDiscover && view === "map" && "max-lg:min-h-0 max-lg:overflow-hidden max-lg:py-4",
        )}
      >
        {isSessionPending ? (
          <>
            <GroupsHeader />
            <div className="flex justify-center py-8">
              <Loader
                variant="player"
                label={t("groups.list.loading")}
              />
            </div>
          </>
        ) : user ? (
          tab === "discover" ? (
            <DiscoverTab
              viewerId={user.id}
              activityLabel={activityLabel}
              header={<GroupsHeader tabs={<GroupTabs active={tab} />} />}
              view={view}
              onViewChange={setView}
            />
          ) : (
            <>
              <GroupsHeader tabs={<GroupTabs active={tab} />} />
              {tab === "requests" ? (
                <MyMembershipRequests userId={user.id} />
              ) : (
                <MyGroups activityLabel={activityLabel} />
              )}
            </>
          )
        ) : (
          <DiscoverTab
            viewerId={null}
            activityLabel={activityLabel}
            header={<GroupsHeader />}
            view={view}
            onViewChange={setView}
          />
        )}
      </AppShell>
    </>
  )
}

import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppShell } from "@/app/AppShell"
import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { activityName } from "@/features/activity/activityName"
import { useActivityOptions } from "@/features/activity/hooks/useActivityOptions"
import { useSession } from "@/features/auth/hooks/useSession"
import { EventFiltersBar } from "@/features/event/components/EventFiltersBar"
import { useSearchText } from "@/features/event/hooks/useSearchText"
import { eventsSearchSchema, nonEmpty, searchWithFilters } from "@/features/event/lib/eventsSearch"
import { DiscoverGroups } from "@/features/group/components/DiscoverGroups"
import type { ActivityLabel } from "@/features/group/components/GroupCard"
import { GroupTabs } from "@/features/group/components/GroupTabs"
import { MyGroups } from "@/features/group/components/MyGroups"
import { MyMembershipRequests } from "@/features/group/components/MyMembershipRequests"

// "Objevit" is always the first tab and the default, so it has no param (like the
// event pages); anything unknown falls back to it. The filters of the list are
// the event list's, minus the dates a group does not have.
const groupsSearchSchema = eventsSearchSchema
  .pick({ activity: true, q: true, location: true })
  .extend({
    // An old link with ?tab=discover is the same page as no param.
    tab: z
      .enum(["discover", "mine", "requests"])
      .optional()
      .catch(undefined)
      .transform((tab) => (tab === "discover" ? undefined : tab)),
  })

export const Route = createFileRoute("/groups/")({
  component: GroupsPage,
  validateSearch: groupsSearchSchema,
})

// "Objevit" with its search and filters in the address. Its own component, so the
// activities for the filter panel are fetched only where the panel is.
function DiscoverTab({
  viewerId,
  activityLabel,
}: {
  viewerId: string | null
  activityLabel: ActivityLabel
}) {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const filters = {
    activityIds: search.activity ?? [],
    search: search.q ?? "",
    location: search.location ?? "",
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

  return (
    <DiscoverGroups
      viewerId={viewerId}
      activityLabel={activityLabel}
      filters={filters}
      // The event list's search field and filter chips; groups have no dates.
      filtersBar={
        <EventFiltersBar
          filters={{ ...filters, dateFrom: "", dateTo: "" }}
          isRangeReversed={false}
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onFiltersChange={(next) =>
            void navigate({ search: (previous) => searchWithFilters(previous, next) })
          }
          activityOptions={activityOptions.options}
          activitiesState={activityOptions.state}
          fields={["activity", "location"]}
          searchPlaceholder={t("groups.list.searchPlaceholder")}
          sortNote={t("groups.list.sortNote")}
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
  const activityLabel: ActivityLabel = (activity) => activityName(t, activity)

  return (
    <>
      <Seo title={t("groups.list.title")} />
      <AppShell className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="typo-h1 text-foreground">{t("groups.list.title")}</h1>
          <Button asChild>
            <Link to={ROUTES.newGroup}>{t("groups.list.create")}</Link>
          </Button>
        </div>
        {isSessionPending ? (
          <div className="flex justify-center py-8">
            <Loader
              variant="player"
              label={t("groups.list.loading")}
            />
          </div>
        ) : user ? (
          <>
            <GroupTabs active={tab} />
            {tab === "requests" ? (
              <MyMembershipRequests userId={user.id} />
            ) : tab === "mine" ? (
              <MyGroups activityLabel={activityLabel} />
            ) : (
              <DiscoverTab
                viewerId={user.id}
                activityLabel={activityLabel}
              />
            )}
          </>
        ) : (
          <DiscoverTab
            viewerId={null}
            activityLabel={activityLabel}
          />
        )}
      </AppShell>
    </>
  )
}

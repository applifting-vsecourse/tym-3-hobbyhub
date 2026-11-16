import { useState } from "react"
import {
  keepPreviousData,
  useInfiniteQuery,
  useSuspenseQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Seo } from "@/components/Seo"
import { useFiltersPanel } from "@/hooks/useFiltersPanel"

import { activityName } from "@/features/activity/activityName"
import { useActivityOptions } from "@/features/activity/hooks/useActivityOptions"
import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import {
  myApplicationsQueryOptions,
  myHostedEventsQueryOptions,
} from "@/features/event/api/myEventsQueryOptions"
import { EventFiltersBar } from "@/features/event/components/EventFiltersBar"
import {
  EventFiltersPanel,
  isPanelOpen,
  panelFiltersButton,
} from "@/features/event/components/EventFiltersPanel"
import { MyEventsOverview, type MyEventsList } from "@/features/event/components/MyEventsOverview"
import { useSearchText } from "@/features/event/hooks/useSearchText"
import {
  eventsSearchSchema,
  filtersFromSearch,
  hasFilters,
  nonEmpty,
  searchWithFilters,
  type EventFilterChange,
} from "@/features/event/lib/eventsSearch"

import { ApplicationSheet, type ApplicationSheetState } from "./-my-events/ApplicationSheet"

// The filters of the event list, and the tab: "Přihlášky" is the default and
// has no param; anything unknown falls back to it.
const myEventsSearchSchema = eventsSearchSchema.extend({
  tab: z.enum(["hosted"]).optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/my-events")({
  component: MyEventsPage,
  validateSearch: myEventsSearchSchema,
})

type Pages<T> = InfiniteData<{ items: T[]; total: number }>

/** The overview's view of one infinite query: all loaded rows and what the button needs. */
function toList<T>(query: UseInfiniteQueryResult<Pages<T>, Error>): MyEventsList<T> {
  return {
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isStale: query.isPlaceholderData,
    error: query.error,
    // No next page of the previous filter while the new one loads.
    hasMore: query.hasNextPage && !query.isPlaceholderData,
    isLoadingMore: query.isFetchingNextPage,
    // A running fetch is not cancelled by a second ask for the same page.
    onLoadMore: () => void query.fetchNextPage({ cancelRefetch: false }),
    onReload: () => void query.refetch(),
    // Retry what failed: the next page, or the reload that went wrong.
    onRetry: () =>
      void (query.isFetchNextPageError
        ? query.fetchNextPage({ cancelRefetch: false })
        : query.refetch()),
  }
}

// F-06.3 (#41): applications with their state and the events the person
// organizes; #177 adds history (what is over goes last), the tab in the URL
// and the search and filters of the event list, shared by both tabs. The
// layout around the page sends visitors without a session to the sign-in, so
// there is one.
function MyEventsPage() {
  const { t } = useTranslation()
  const { data: session } = useSuspenseQuery(authSessionQueryOptions())
  const userId = session?.user.id ?? ""
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { filters, isRangeReversed } = filtersFromSearch(search)
  // The previous list stays on screen while the next one loads, so typing does not flash.
  const applications = useInfiniteQuery({
    ...myApplicationsQueryOptions(userId, filters),
    placeholderData: keepPreviousData,
  })
  const hosted = useInfiniteQuery({
    ...myHostedEventsQueryOptions(userId, filters),
    placeholderData: keepPreviousData,
  })
  const activityOptions = useActivityOptions()
  const filtersPanel = useFiltersPanel()
  const onFiltersChange = (next: EventFilterChange) =>
    void navigate({ search: (previous) => searchWithFilters(previous, next) })
  const [searchText, setSearchText] = useSearchText(
    filters.search,
    (next) =>
      void navigate({
        search: (previous) => ({ ...previous, q: nonEmpty(next) }),
        replace: true,
      }),
  )
  // Clearing keeps the tab.
  const clearFilters = () => {
    setSearchText("")
    void navigate({ search: (previous) => ({ tab: previous.tab }) })
  }
  const applicationList = toList(applications)
  // #171: the row's menu opens the same dialog as the event detail. The event
  // stays chosen after the sheet closes, so it animates out with its content.
  const [sheet, setSheet] = useState<ApplicationSheetState>({ eventId: null, step: null })

  return (
    <>
      <Seo title={t("myEvents.title")} />
      <section className="mx-auto w-full max-w-page px-page py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("myEvents.title")}</h1>
        {/* On a large screen the filters are open beside both tabs (#224). */}
        <div className="mt-6 xl:grid xl:grid-cols-[auto_minmax(0,1fr)] xl:items-start xl:gap-8">
          <EventFiltersPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            panel={filtersPanel}
            activityOptions={activityOptions.options}
            activitiesState={activityOptions.state}
            sortNote={t("myEvents.sortNote")}
            className="xl:sticky xl:top-20 xl:max-h-[calc(100svh-6rem)] xl:overflow-y-auto"
          />
          <MyEventsOverview
            applications={applicationList}
            hosted={toList(hosted)}
            tab={search.tab ?? "applications"}
            isFiltered={hasFilters(filters)}
            onClearFilters={clearFilters}
            filters={
              <EventFiltersBar
                filters={filters}
                isRangeReversed={isRangeReversed}
                searchText={searchText}
                onSearchTextChange={setSearchText}
                activityOptions={activityOptions.options}
                activitiesState={activityOptions.state}
                sortNote={t("myEvents.sortNote")}
                onFiltersChange={onFiltersChange}
                onOpenFilters={panelFiltersButton(filtersPanel)}
                shouldShowChips={!isPanelOpen(filtersPanel)}
              />
            }
            activityLabel={(activity) => activityName(t, activity)}
            onApplicationAction={(step, application) =>
              setSheet({ eventId: application.event.id, step })
            }
          />
        </div>
      </section>
      <ApplicationSheet
        applications={applicationList.items}
        state={sheet}
        onStepChange={(step) => setSheet((shown) => ({ ...shown, step }))}
      />
    </>
  )
}

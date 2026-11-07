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

import { activityName } from "@/features/activity/activityName"
import { useActivityOptions } from "@/features/activity/hooks/useActivityOptions"
import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import {
  myApplicationsQueryOptions,
  myHostedEventsQueryOptions,
} from "@/features/event/api/myEventsQueryOptions"
import { EventFiltersBar } from "@/features/event/components/EventFiltersBar"
import { MyEventsOverview, type MyEventsList } from "@/features/event/components/MyEventsOverview"
import { useSearchText } from "@/features/event/hooks/useSearchText"
import {
  eventsSearchSchema,
  filtersFromSearch,
  hasFilters,
  nonEmpty,
  searchWithFilters,
} from "@/features/event/lib/eventsSearch"

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

  return (
    <>
      <Seo title={t("myEvents.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("myEvents.title")}</h1>
        <div className="mt-6">
          <MyEventsOverview
            applications={toList(applications)}
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
                onFiltersChange={(next) =>
                  void navigate({ search: (previous) => searchWithFilters(previous, next) })
                }
              />
            }
            activityLabel={(activity) => activityName(t, activity)}
          />
        </div>
      </section>
    </>
  )
}

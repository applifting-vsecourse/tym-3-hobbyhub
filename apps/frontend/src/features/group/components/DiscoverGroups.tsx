import type { ReactNode } from "react"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { NoMatchingResults } from "@/components/hobbyhub/NoMatchingResults"
import { ViewToggle, type EventsView } from "@/components/hobbyhub/ViewToggle"
import { Button } from "@/components/ui/button"
import { useMediaQuery, WIDE_QUERY } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

import type { DiscoverGroupsFilters } from "@/features/group/api/groupKeys"
import { discoverGroupsQueryOptions } from "@/features/group/api/groupListQueryOptions"
import type { Group } from "@/features/group/api/groupSchemas"
import { GroupCard, type ActivityLabel } from "@/features/group/components/GroupCard"
import { GroupGrid } from "@/features/group/components/GroupGrid"

type DiscoverGroupsProps = {
  /** The signed-in user, or null for a visitor, who sees every public group. */
  viewerId: string | null
  activityLabel: ActivityLabel
  /** The filters in the address. */
  filters: DiscoverGroupsFilters
  /** The page's title, intro and tabs, above the search; they scroll away with nothing, as on the event list. */
  header?: ReactNode
  /** The search field and the filter chips; the page builds them (the event list's bar). */
  filtersBar: ReactNode
  /** The filters open beside the list on a large screen (#224); nothing where there is no room. */
  filtersPanel?: ReactNode
  /** The map of the groups of the filter, beside the list from `lg` and instead of it on a phone (ADR-0028). */
  renderMap?: (groups: Group[]) => ReactNode
  /** Which of the two a phone shows; the page keeps it, because the shell around depends on it. */
  view: EventsView
  onViewChange: (view: EventsView) => void
  onClearFilters: () => void
}

/**
 * "Objevit" tab: public groups the viewer is not in, a page at a time, laid out
 * like the event list (#222): the search and filters on top, the list beside a
 * map from `lg`, and on a phone one of the two at a time (ADR-0028).
 */
export function DiscoverGroups({
  viewerId,
  activityLabel,
  filters,
  header,
  filtersBar,
  filtersPanel,
  renderMap,
  view,
  onViewChange,
  onClearFilters,
}: DiscoverGroupsProps) {
  const { t } = useTranslation()
  // The map is built only where it is on screen: a phone never starts Mapbox for the wide layout.
  const isWide = useMediaQuery(WIDE_QUERY)
  // The previous list stays on screen while the next one loads, so typing does not flash.
  const discover = useInfiniteQuery({
    ...discoverGroupsQueryOptions(viewerId, filters),
    placeholderData: keepPreviousData,
  })
  const isFiltered =
    filters.activityIds.length > 0 ||
    filters.search !== "" ||
    filters.location !== "" ||
    filters.approvalMode !== undefined ||
    filters.onlyWithUpcomingEvent === true ||
    filters.near !== undefined
  const groups = discover.data?.pages.flatMap((page) => page.items)
  const isMapShown = renderMap !== undefined && (isWide || view === "map")

  return (
    <section
      aria-labelledby="discover-groups-heading"
      className={cn(
        // The same frame as the event list: the list keeps its width, the map takes the rest.
        "grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:gap-8",
        renderMap
          ? "lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,28rem)_minmax(0,1fr)]"
          : "xl:grid-cols-[auto_minmax(0,1fr)]",
        renderMap &&
          view === "map" &&
          "max-lg:min-h-0 max-lg:flex-1 max-lg:grid-rows-[auto_minmax(0,1fr)]",
      )}
    >
      {filtersPanel}
      <div className="flex min-w-0 flex-col gap-6 lg:min-h-0 lg:gap-4">
        <h2
          id="discover-groups-heading"
          className="sr-only"
        >
          {t("groups.list.tabs.discover")}
        </h2>
        {header}
        {filtersBar}
        {renderMap ? (
          <ViewToggle
            value={view}
            onValueChange={onViewChange}
            className="w-full lg:hidden"
          />
        ) : null}
        <div
          aria-busy={discover.isPlaceholderData}
          className={cn(
            // Room for the rows' hover surface, which reaches past the column.
            "lg:-mx-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3",
            renderMap && view === "map" && "max-lg:hidden",
            discover.isPlaceholderData && "opacity-60 transition-opacity",
          )}
        >
          <GroupGrid
            items={groups}
            isPending={discover.isPending}
            // A failed next page keeps the loaded ones; the button below retries it.
            error={groups ? null : discover.error}
            onRetry={() => void discover.refetch()}
            getKey={(group) => group.id}
            renderItem={(group) => (
              <GroupCard
                group={group}
                activityLabel={activityLabel}
              />
            )}
            empty={
              isFiltered ? (
                <NoMatchingResults
                  title={t("groups.list.emptyFiltered.title")}
                  description={t("groups.list.emptyFiltered.description")}
                  clearLabel={t("groups.list.emptyFiltered.clear")}
                  onClearFilters={onClearFilters}
                />
              ) : viewerId ? (
                t("groups.list.discoverEmpty")
              ) : (
                t("groups.list.discoverEmptyVisitor")
              )
            }
          />
          {discover.hasNextPage && !discover.isPlaceholderData ? (
            <div className="mt-6 flex flex-col items-center gap-2">
              {discover.isFetchNextPageError ? (
                <p
                  role="alert"
                  className="typo-small text-destructive"
                >
                  {t("groups.list.loadMoreError")}
                </p>
              ) : null}
              <Button
                variant="outline"
                disabled={discover.isFetchingNextPage}
                onClick={() => void discover.fetchNextPage()}
              >
                {discover.isFetchingNextPage
                  ? t("groups.list.loadingMore")
                  : t("groups.list.loadMore")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {renderMap ? (
        <div className={view === "map" ? "min-h-0" : "max-lg:hidden lg:min-h-0"}>
          {isMapShown ? renderMap(groups ?? []) : null}
        </div>
      ) : null}
    </section>
  )
}

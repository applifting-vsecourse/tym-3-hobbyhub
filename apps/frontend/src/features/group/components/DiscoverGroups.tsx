import { useState, type ReactNode } from "react"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { NoMatchingResults } from "@/components/hobbyhub/NoMatchingResults"
import { Button } from "@/components/ui/button"
import { toggleVariants } from "@/components/ui/toggle"
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
  /** The search field and the filter chips; the page builds them (the event list's bar). */
  filtersBar: ReactNode
  /** The filters open beside the list on a large screen (#224); nothing where there is no room. */
  filtersPanel?: ReactNode
  /** The extra filters of groups under the search (joining, upcoming, radius, order). */
  extraFilters?: ReactNode
  /** The map of the groups on screen, beside the list from `xl` (ADR-0028). */
  renderMap?: (groups: Group[]) => ReactNode
  /** The page's tabs for a signed-in viewer, above the search beside the filters. */
  tabs?: ReactNode
  onClearFilters: () => void
}

/**
 * "Objevit" tab: public groups the viewer is not in, a page at a time, with the
 * search and filters of the event list (#222): text, activity and place. Groups
 * have no date and no coordinates, so there is no date filter and no map.
 */
export function DiscoverGroups({
  viewerId,
  activityLabel,
  filters,
  filtersBar,
  filtersPanel,
  extraFilters,
  renderMap,
  tabs,
  onClearFilters,
}: DiscoverGroupsProps) {
  const { t } = useTranslation()
  // Below `xl` the map and the list take turns; from `xl` they sit side by side.
  const [isMapShown, setIsMapShown] = useState(false)
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

  return (
    <section
      aria-labelledby="discover-groups-heading"
      className={cn(
        "flex flex-col gap-6 xl:grid xl:items-start xl:gap-8",
        renderMap
          ? "xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,26rem)]"
          : "xl:grid-cols-[auto_minmax(0,1fr)]",
      )}
    >
      <h2
        id="discover-groups-heading"
        className="sr-only"
      >
        {t("groups.list.tabs.discover")}
      </h2>
      {filtersPanel}
      <div className="flex min-w-0 flex-col gap-6">
        {tabs}
        {filtersBar}
        {extraFilters}
        {renderMap ? (
          <div
            role="group"
            aria-label={t("groups.map.label")}
            className="flex gap-2 xl:hidden"
          >
            {[false, true].map((isMapOption) => (
              <button
                key={String(isMapOption)}
                type="button"
                aria-pressed={isMapShown === isMapOption}
                data-state={isMapShown === isMapOption ? "on" : "off"}
                className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
                onClick={() => setIsMapShown(isMapOption)}
              >
                {isMapOption ? t("groups.map.show") : t("groups.map.list")}
              </button>
            ))}
          </div>
        ) : null}
        {renderMap && isMapShown ? (
          <div className="h-[60svh] xl:hidden">{renderMap(groups ?? [])}</div>
        ) : null}
        <div
          aria-busy={discover.isPlaceholderData}
          className={cn(
            discover.isPlaceholderData && "opacity-60 transition-opacity",
            isMapShown && "max-xl:hidden",
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
        </div>
        {discover.hasNextPage && !discover.isPlaceholderData ? (
          <div className="flex flex-col items-center gap-2">
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
      {renderMap ? (
        <div className="hidden xl:sticky xl:top-20 xl:block xl:h-[calc(100svh-6rem)]">
          {renderMap(groups ?? [])}
        </div>
      ) : null}
    </section>
  )
}

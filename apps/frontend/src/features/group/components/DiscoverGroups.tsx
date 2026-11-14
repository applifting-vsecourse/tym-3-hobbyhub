import type { ReactNode } from "react"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { DiscoverGroupsFilters } from "@/features/group/api/groupKeys"
import { discoverGroupsQueryOptions } from "@/features/group/api/groupListQueryOptions"
import { GroupCard, type ActivityLabel } from "@/features/group/components/GroupCard"
import { GroupGrid } from "@/features/group/components/GroupGrid"
import { NoMatchingGroups } from "@/features/group/components/NoMatchingGroups"

type DiscoverGroupsProps = {
  /** The signed-in user, or null for a visitor, who sees every public group. */
  viewerId: string | null
  activityLabel: ActivityLabel
  /** The filters in the address. */
  filters: DiscoverGroupsFilters
  /** The search field and the filter chips; the page builds them (the event list's bar). */
  filtersBar: ReactNode
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
  onClearFilters,
}: DiscoverGroupsProps) {
  const { t } = useTranslation()
  // The previous list stays on screen while the next one loads, so typing does not flash.
  const discover = useInfiniteQuery({
    ...discoverGroupsQueryOptions(viewerId, filters),
    placeholderData: keepPreviousData,
  })
  const isFiltered =
    filters.activityIds.length > 0 || filters.search !== "" || filters.location !== ""
  const groups = discover.data?.pages.flatMap((page) => page.items)

  return (
    <section
      aria-labelledby="discover-groups-heading"
      className="flex flex-col gap-6"
    >
      <h2
        id="discover-groups-heading"
        className="sr-only"
      >
        {t("groups.list.tabs.discover")}
      </h2>
      {filtersBar}
      <div
        aria-busy={discover.isPlaceholderData}
        className={discover.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}
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
              <NoMatchingGroups onClearFilters={onClearFilters} />
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
            {discover.isFetchingNextPage ? t("groups.list.loadingMore") : t("groups.list.loadMore")}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

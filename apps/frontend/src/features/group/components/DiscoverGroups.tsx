import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { discoverGroupsQueryOptions } from "@/features/group/api/groupListQueryOptions"
import { GroupCard, type ActivityLabel } from "@/features/group/components/GroupCard"
import { GroupGrid } from "@/features/group/components/GroupGrid"

type DiscoverGroupsProps = {
  /** The signed-in user, or null for a visitor, who sees every public group. */
  viewerId: string | null
  activityLabel: ActivityLabel
}

/** "Objevit" tab: public groups the viewer is not in, a page at a time. */
export function DiscoverGroups({ viewerId, activityLabel }: DiscoverGroupsProps) {
  const { t } = useTranslation()
  const discover = useInfiniteQuery(discoverGroupsQueryOptions(viewerId))
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
        empty={viewerId ? t("groups.list.discoverEmpty") : t("groups.list.discoverEmptyVisitor")}
      />
      {discover.hasNextPage ? (
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

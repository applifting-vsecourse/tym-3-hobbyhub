import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/Seo"

import { activityName } from "@/features/activity/activityName"
import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import {
  myApplicationsQueryOptions,
  myHostedEventsQueryOptions,
} from "@/features/event/api/myEventsQueryOptions"
import { MyEventsOverview, type MyEventsList } from "@/features/event/components/MyEventsOverview"

export const Route = createFileRoute("/_ProtectedPages/my-events")({
  component: MyEventsPage,
})

// F-06.3 (#41): applications with their state and the events the person
// organizes. History of finished events is a later story.
function MyEventsPage() {
  const { t } = useTranslation()
  const session = useQuery(authSessionQueryOptions())
  const userId = session.data?.user.id ?? ""
  const isEnabled = userId !== ""
  const applicationsQuery = useInfiniteQuery({
    ...myApplicationsQueryOptions(userId),
    enabled: isEnabled,
  })
  const hostedQuery = useInfiniteQuery({
    ...myHostedEventsQueryOptions(userId),
    enabled: isEnabled,
  })

  // A disabled query is "pending" for good, so the loader follows what is fetching.
  const listOf = <T,>(
    query: typeof applicationsQuery | typeof hostedQuery,
    items: T[],
  ): MyEventsList<T> => ({
    items,
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: session.isPending || query.isLoading,
    error: query.error ?? (session.isSuccess && !isEnabled ? new Error("No session") : null),
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
    onReload: () => void query.refetch(),
  })

  return (
    <>
      <Seo title={t("myEvents.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("myEvents.title")}</h1>
        <div className="mt-6">
          <MyEventsOverview
            applications={listOf(
              applicationsQuery,
              applicationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
            )}
            hosted={listOf(
              hostedQuery,
              hostedQuery.data?.pages.flatMap((page) => page.items) ?? [],
            )}
            activityLabel={(activity) => activityName(t, activity)}
          />
        </div>
      </section>
    </>
  )
}

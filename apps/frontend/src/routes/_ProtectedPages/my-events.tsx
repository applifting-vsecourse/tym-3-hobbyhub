import {
  useInfiniteQuery,
  useSuspenseQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query"
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

type Pages<T> = InfiniteData<{ items: T[]; total: number }>

/** The overview's view of one infinite query: all loaded rows and what the button needs. */
function toList<T>(query: UseInfiniteQueryResult<Pages<T>, Error>): MyEventsList<T> {
  return {
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    hasMore: query.hasNextPage,
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
// organizes. History of finished events is a later story. The layout around
// the page sends visitors without a session to the sign-in, so there is one.
function MyEventsPage() {
  const { t } = useTranslation()
  const { data: session } = useSuspenseQuery(authSessionQueryOptions())
  const userId = session?.user.id ?? ""
  const applications = useInfiniteQuery(myApplicationsQueryOptions(userId))
  const hosted = useInfiniteQuery(myHostedEventsQueryOptions(userId))

  return (
    <>
      <Seo title={t("myEvents.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("myEvents.title")}</h1>
        <div className="mt-6">
          <MyEventsOverview
            applications={toList(applications)}
            hosted={toList(hosted)}
            activityLabel={(activity) => activityName(t, activity)}
          />
        </div>
      </section>
    </>
  )
}

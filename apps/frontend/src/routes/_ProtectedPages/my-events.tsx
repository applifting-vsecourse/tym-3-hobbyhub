import { useState } from "react"
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

import { ApplicationSheet, type ApplicationSheetState } from "./-my-events/ApplicationSheet"

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
  const applicationList = toList(applications)
  // #171: the row's menu opens the same dialog as the event detail. The event
  // stays chosen after the sheet closes, so it animates out with its content.
  const [sheet, setSheet] = useState<ApplicationSheetState>({ eventId: null, step: null })

  return (
    <>
      <Seo title={t("myEvents.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("myEvents.title")}</h1>
        <div className="mt-6">
          <MyEventsOverview
            applications={applicationList}
            hosted={toList(hosted)}
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

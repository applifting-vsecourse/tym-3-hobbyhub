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
import type { MyApplication } from "@/features/event/api/myEventsSchemas"
import {
  MyEventsOverview,
  type ApplicationAction,
  type MyEventsList,
} from "@/features/event/components/MyEventsOverview"
import { eventPlace, eventTime } from "@/features/event/lib/eventLabels"
import { CancelParticipationSheet } from "@/features/participation-request/components/CancelParticipationSheet"

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
  const { t, i18n } = useTranslation()
  const { data: session } = useSuspenseQuery(authSessionQueryOptions())
  const userId = session?.user.id ?? ""
  const applications = useInfiniteQuery(myApplicationsQueryOptions(userId))
  const hosted = useInfiniteQuery(myHostedEventsQueryOptions(userId))
  // #171: the row's menu opens the same dialog as the event detail. The
  // application stays after the sheet closes, so it animates out with its event.
  const [seatSheet, setSeatSheet] = useState<{
    application: MyApplication
    step: ApplicationAction | null
  } | null>(null)

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
            onApplicationAction={(step, application) => setSeatSheet({ application, step })}
          />
        </div>
      </section>
      {seatSheet ? (
        <CancelParticipationSheet
          eventId={seatSheet.application.event.id}
          event={{
            title: seatSheet.application.event.title,
            time: eventTime(seatSheet.application.event.startAt, i18n.language),
            place: [eventPlace(t, seatSheet.application.event), seatSheet.application.event.level]
              .filter(Boolean)
              .join(", "),
            taken: seatSheet.application.event.takenCount,
            min: seatSheet.application.event.minParticipants,
            max: seatSheet.application.event.maxParticipants,
          }}
          step={seatSheet.step}
          onStepChange={(step) => setSeatSheet({ ...seatSheet, step })}
        />
      ) : null}
    </>
  )
}

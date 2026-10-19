import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header/Header"
import { ViewToggle, type EventsView } from "@/components/hobbyhub/ViewToggle"
import { Seo } from "@/components/Seo"

import { activityName } from "@/features/activity/activityName"
import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { eventsQueryOptions } from "@/features/event/api/eventsQueryOptions"
import { EventList } from "@/features/event/components/EventList"
import { EventsMapPlaceholder } from "@/features/event/components/EventsMapPlaceholder"

export const Route = createFileRoute("/events/")({
  component: EventsPage,
})

// Pages are cut by offset, so an event that moved between two requests can come
// back on the next page; keep its first appearance.
const uniqueById = <T extends { id: string }>(items: T[]): T[] => [
  ...new Map(items.map((item) => [item.id, item])).values(),
]

// Public: browsing events needs no account. On phones one view at a time, from
// `lg` the list and the map sit side by side.
function EventsPage() {
  const { t } = useTranslation()
  const [view, setView] = useState<EventsView>("list")
  const eventsQuery = useInfiniteQuery(eventsQueryOptions())

  return (
    <>
      <Seo title={t("events.list.seoTitle")} />
      <Header userMenu={<HeaderMenu />} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10 lg:px-8">
        <h1 className="typo-h1 text-foreground">{t("events.list.title")}</h1>
        <ViewToggle
          value={view}
          onValueChange={setView}
          className="w-full lg:hidden"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-8">
          <div className={view === "list" ? undefined : "max-lg:hidden"}>
            <EventList
              events={uniqueById(eventsQuery.data?.pages.flatMap((page) => page.items) ?? [])}
              total={eventsQuery.data?.pages[0]?.total ?? 0}
              activityLabel={(activity) => activityName(t, activity)}
              isLoading={eventsQuery.isPending}
              error={eventsQuery.error}
              onReload={() => void eventsQuery.refetch()}
              hasMore={eventsQuery.hasNextPage}
              isLoadingMore={eventsQuery.isFetchingNextPage}
              onLoadMore={() => void eventsQuery.fetchNextPage()}
            />
          </div>
          <div className={view === "map" ? undefined : "max-lg:hidden"}>
            <EventsMapPlaceholder />
          </div>
        </div>
      </main>
    </>
  )
}

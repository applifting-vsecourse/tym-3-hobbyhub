import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"

import { activityName } from "@/features/activity/activityName"
import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { eventsQueryOptions } from "@/features/event/api/eventsQueryOptions"
import { EventList } from "@/features/event/components/EventList"

export const Route = createFileRoute("/events")({
  component: EventsPage,
})

// Public: browsing events needs no account.
function EventsPage() {
  const { t } = useTranslation()
  const eventsQuery = useQuery(eventsQueryOptions())

  return (
    <>
      <Seo title={t("events.list.seoTitle")} />
      <Header userMenu={<HeaderMenu />} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10 lg:px-8">
        <h1 className="typo-h1 text-foreground">{t("events.list.title")}</h1>
        <EventList
          events={eventsQuery.data ?? []}
          activityLabel={(activity) => activityName(t, activity)}
          isLoading={eventsQuery.isPending}
          error={eventsQuery.error}
          onReload={() => void eventsQuery.refetch()}
        />
      </main>
    </>
  )
}

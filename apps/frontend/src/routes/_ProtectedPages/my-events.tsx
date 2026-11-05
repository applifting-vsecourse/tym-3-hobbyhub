import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/Seo"

import { activityName } from "@/features/activity/activityName"
import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { myEventsQueryOptions } from "@/features/event/api/myEventsQueryOptions"
import { MyEventsOverview } from "@/features/event/components/MyEventsOverview"

export const Route = createFileRoute("/_ProtectedPages/my-events")({
  component: MyEventsPage,
})

// F-06.3 (#41): applications with their state and the events the person
// organizes. History of finished events is a later story.
function MyEventsPage() {
  const { t } = useTranslation()
  const session = useQuery(authSessionQueryOptions())
  const userId = session.data?.user.id ?? ""
  const query = useQuery({ ...myEventsQueryOptions(userId), enabled: userId !== "" })

  return (
    <>
      <Seo title={t("myEvents.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("myEvents.title")}</h1>
        <div className="mt-6">
          <MyEventsOverview
            data={query.data}
            activityLabel={(activity) => activityName(t, activity)}
            isLoading={session.isPending || query.isPending}
            error={query.error}
            onReload={() => void query.refetch()}
          />
        </div>
      </section>
    </>
  )
}

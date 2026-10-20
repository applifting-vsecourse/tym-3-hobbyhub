import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { activityName } from "@/features/activity/activityName"
import { groupQueryOptions } from "@/features/group/api/groupQueryOptions"

export const Route = createFileRoute("/_ProtectedPages/groups/$groupId")({
  component: GroupDetailPage,
})

// Minimal detail so a new group has somewhere to land; F-07.2 #47 builds it out.
function GroupDetailPage() {
  const { groupId } = Route.useParams()
  const { t } = useTranslation()
  const groupQuery = useQuery(groupQueryOptions(groupId))

  if (groupQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader
          variant="player"
          label={t("groups.detail.loading")}
        />
      </div>
    )
  }

  if (groupQuery.isError) {
    const error = groupQuery.error
    if (error instanceof HTTPError && error.response.status === 404) return <NotFound />

    return (
      <section className="mx-auto w-full max-w-2xl px-4 py-6 md:py-12">
        <Alert variant="destructive">
          <AlertTitle>{t("groups.detail.loadError")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void groupQuery.refetch()}
            >
              {t("groups.form.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  const group = groupQuery.data
  const meta = [
    group.locationName,
    group.usualSchedule,
    t("groups.detail.members", { count: group.memberCount }),
  ].filter(Boolean)

  return (
    <>
      <Seo title={group.name} />
      <section className="mx-auto w-full max-w-2xl px-4 py-6 md:py-12">
        <BackLink
          to={ROUTES.groups}
          label={t("groups.back")}
        />
        <p className="flex items-center gap-2 typo-label text-muted-foreground">
          {isActivityKey(group.activity.icon) ? (
            <ActivityIcon
              activity={group.activity.icon}
              className="size-5"
            />
          ) : null}
          {activityName(t, group.activity)}
        </p>
        <h1 className="mt-2 typo-h1 text-foreground">{group.name}</h1>
        <p className="mt-2 typo-body text-muted-foreground">{meta.join(" · ")}</p>
        <p className="mt-6 typo-body break-words whitespace-pre-line text-foreground">
          {group.description}
        </p>
      </section>
    </>
  )
}

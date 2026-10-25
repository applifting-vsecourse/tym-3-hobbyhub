import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useLocation } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { activityName } from "@/features/activity/activityName"
import { AppShell } from "@/features/auth/components/AppShell"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"
import { groupQueryOptions } from "@/features/group/api/groupQueryOptions"
import { GroupDetail } from "@/features/group/components/GroupDetail"
import { useGroupMembershipState } from "@/features/group/hooks/useGroupMembershipState"

export const Route = createFileRoute("/groups/$groupId")({
  component: GroupDetailPage,
})

// Public detail (F-02.5): outside the protected pages, so a visitor can open it
// from an event.
function GroupDetailPage() {
  const { groupId } = Route.useParams()
  const { t } = useTranslation()
  const location = useLocation()
  const { user, isPending: isSessionPending } = useSession()
  const membership = useGroupMembershipState(groupId, {
    isSignedIn: user !== null,
    isPending: isSessionPending,
  })
  const groupQuery = useQuery(groupQueryOptions(groupId))

  if (
    groupQuery.isError &&
    groupQuery.error instanceof HTTPError &&
    groupQuery.error.response.status === 404
  ) {
    return (
      <>
        <Seo title={t("groups.detail.title")} />
        <AppShell>
          <NotFound />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <Seo title={groupQuery.data?.name ?? t("groups.detail.title")} />
      <AppShell className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        {user ? (
          <BackLink
            to={ROUTES.groups}
            label={t("groups.back")}
          />
        ) : (
          <BackLink
            to={ROUTES.events}
            label={t("groups.detail.backToEvents")}
          />
        )}
        {groupQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Loader
              variant="player"
              label={t("groups.detail.loading")}
            />
          </div>
        ) : groupQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("groups.detail.loadError")}</AlertTitle>
            <AlertDescription className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void groupQuery.refetch()}
              >
                {t("groups.form.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <GroupDetail
            group={groupQuery.data}
            activityLabel={activityName(t, groupQuery.data.activity)}
            membership={membership}
            from={encodeRedirectUri(location)}
          />
        )}
      </AppShell>
    </>
  )
}

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useLocation } from "@tanstack/react-router"
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
import { eventDetailQueryOptions } from "@/features/event/api/eventDetailQueryOptions"
import { eventKeys } from "@/features/event/api/eventKeys"
import { EventDetail } from "@/features/event/components/EventDetail"
import { myRequestQueryOptions } from "@/features/participation-request/api/myRequestQueryOptions"
import { JoinRequestAction } from "@/features/participation-request/components/JoinRequestAction"
import { OwnRequestPanel } from "@/features/participation-request/components/OwnRequestPanel"
import { ownSeatView } from "@/features/participation-request/lib/joinPanel"

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
})

// Public detail (F-02.4). A visitor is sent to sign up and brought back here;
// a signed-in user asks to join right on the page (F-06.1).
function EventDetailPage() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation()
  const location = useLocation()
  const { user, isPending: isSessionPending } = useSession()
  const eventQuery = useQuery(eventDetailQueryOptions(eventId))
  const myRequestQuery = useQuery({
    ...myRequestQueryOptions(eventId, user?.id ?? ""),
    enabled: user !== null,
  })

  const queryClient = useQueryClient()
  // A request changes nothing on the event itself, but a refusal may mean it
  // filled up or started meanwhile, so the page shows the latest state.
  const refreshEvent = () =>
    queryClient.invalidateQueries({ queryKey: eventKeys.publicDetail(eventId) })

  const ownView = myRequestQuery.data ? ownSeatView(myRequestQuery.data) : null
  const from = encodeRedirectUri(location)
  const joinAction = user ? (
    <JoinRequestAction
      eventId={eventId}
      state={myRequestQuery.data}
      isLoading={myRequestQuery.isPending}
      onChange={refreshEvent}
    />
  ) : isSessionPending ? (
    <Button disabled>{t("events.detail.join")}</Button>
  ) : (
    <>
      <Button asChild>
        <Link
          to={ROUTES.signup}
          search={{ from }}
        >
          {t("events.detail.join")}
        </Link>
      </Button>
      <p className="text-center typo-small text-accent-foreground">
        {t("events.detail.hasAccount")}{" "}
        <Link
          to={ROUTES.login}
          search={{ from }}
          className="font-medium underline underline-offset-4"
        >
          {t("events.detail.signIn")}
        </Link>
      </p>
    </>
  )

  if (
    eventQuery.isError &&
    eventQuery.error instanceof HTTPError &&
    eventQuery.error.response.status === 404
  ) {
    return (
      <>
        <Seo title={t("events.detail.title")} />
        <AppShell>
          <NotFound />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <Seo title={eventQuery.data?.title ?? t("events.detail.title")} />
      <AppShell className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <BackLink
          to={ROUTES.events}
          label={t("events.detail.back")}
        />
        {eventQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Loader
              variant="player"
              label={t("events.detail.loading")}
            />
          </div>
        ) : eventQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("events.detail.loadError")}</AlertTitle>
            <AlertDescription className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void eventQuery.refetch()}
              >
                {t("events.list.reload")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <EventDetail
            event={eventQuery.data}
            activityLabel={activityName(t, eventQuery.data.activity)}
            joinAction={joinAction}
            ownRequest={
              ownView ? (
                <OwnRequestPanel
                  eventId={eventId}
                  view={ownView}
                  onChange={refreshEvent}
                />
              ) : undefined
            }
          />
        )}
      </AppShell>
    </>
  )
}

import { useState } from "react"
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
import { eventPlace, eventTime } from "@/features/event/lib/eventLabels"
import { myRequestQueryOptions } from "@/features/participation-request/api/myRequestQueryOptions"
import { JoinRequestAction } from "@/features/participation-request/components/JoinRequestAction"
import { OwnRequestPanel } from "@/features/participation-request/components/OwnRequestPanel"
import {
  ParticipationRequestSheet,
  type RequestSheetStep,
} from "@/features/participation-request/components/ParticipationRequestSheet"
import { ownSeatView } from "@/features/participation-request/lib/joinPanel"

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
})

// Public detail (F-02.4). A visitor is sent to sign up and brought back here;
// a signed-in user asks to join right on the page (F-06.1).
function EventDetailPage() {
  const { eventId } = Route.useParams()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { user, isPending: isSessionPending } = useSession()
  const eventQuery = useQuery(eventDetailQueryOptions(eventId))
  const myRequestQuery = useQuery({
    ...myRequestQueryOptions(eventId, user?.id ?? ""),
    enabled: user !== null,
  })

  const queryClient = useQueryClient()
  // A seat taken at once (automatic approval) changes the roster; a request
  // waiting for the organizer does not, but a refusal may mean the event filled
  // up or started meanwhile. Either way the page shows the latest state.
  const refreshEvent = () =>
    queryClient.invalidateQueries({ queryKey: eventKeys.publicDetail(eventId) })
  // The sheet lives here, not in the seat panel: sending a request swaps the
  // free seat for the pending request, and the sheet has to survive that.
  const [sheetStep, setSheetStep] = useState<RequestSheetStep | null>(null)

  const ownView = myRequestQuery.data ? ownSeatView(myRequestQuery.data) : null
  const from = encodeRedirectUri(location)
  // Asking is not taking: with manual approval the seat comes only once the
  // organizer says yes; with automatic approval the server takes it at once.
  const joinLabel = t(
    eventQuery.data?.approvalMode === "AUTOMATIC"
      ? "events.detail.join"
      : "events.detail.requestToJoin",
  )
  const joinAction = user ? (
    <JoinRequestAction
      label={joinLabel}
      state={myRequestQuery.data}
      isLoading={myRequestQuery.isPending}
      onRequest={() => setSheetStep("form")}
    />
  ) : isSessionPending ? (
    <Button disabled>{joinLabel}</Button>
  ) : (
    <>
      <Button asChild>
        <Link
          to={ROUTES.signup}
          search={{ from }}
        >
          {joinLabel}
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
                  view={ownView}
                  approvalMode={eventQuery.data.approvalMode}
                  onWithdraw={() => setSheetStep("withdraw")}
                />
              ) : undefined
            }
          />
        )}
        {user && eventQuery.data ? (
          <ParticipationRequestSheet
            eventId={eventId}
            event={{
              title: eventQuery.data.title,
              time: eventTime(eventQuery.data.startAt, i18n.language),
              place: [eventPlace(t, eventQuery.data), eventQuery.data.level]
                .filter(Boolean)
                .join(", "),
              taken: eventQuery.data.takenCount,
              min: eventQuery.data.minParticipants,
              max: eventQuery.data.maxParticipants,
            }}
            applicant={{ name: user.name, isEmailVerified: user.emailVerified }}
            approvalMode={eventQuery.data.approvalMode}
            step={sheetStep}
            onStepChange={setSheetStep}
            onChange={refreshEvent}
          />
        ) : null}
      </AppShell>
    </>
  )
}

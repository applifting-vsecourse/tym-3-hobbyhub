import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useLocation } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AppShell } from "@/app/AppShell"
import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { missingCount } from "@/components/hobbyhub/capacity"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { activityName } from "@/features/activity/activityName"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"
import { eventDetailQueryOptions } from "@/features/event/api/eventDetailQueryOptions"
import { eventKeys } from "@/features/event/api/eventKeys"
import { participantInfoQueryOptions } from "@/features/event/api/participantInfoQueryOptions"
import { EventDetail } from "@/features/event/components/EventDetail"
import { OrganizerActions } from "@/features/event/components/OrganizerActions"
import { ParticipantInfo } from "@/features/event/components/ParticipantInfo"
import { ShareEventAction } from "@/features/event/components/ShareEventAction"
import { eventPlace, eventTime } from "@/features/event/lib/eventLabels"
import { myRequestQueryOptions } from "@/features/participation-request/api/myRequestQueryOptions"
import { JoinRequestAction } from "@/features/participation-request/components/JoinRequestAction"
import { OrganizerPanel } from "@/features/participation-request/components/OrganizerPanel"
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
  // A group-only event (F-07.2) answers by who asks: wait for the session, so
  // a member does not see "not found" first.
  const eventQuery = useQuery({
    ...eventDetailQueryOptions(eventId, user?.id ?? null),
    enabled: !isSessionPending,
  })
  const myRequestQuery = useQuery({
    ...myRequestQueryOptions(eventId, user?.id ?? ""),
    enabled: user !== null,
  })

  const ownView = myRequestQuery.data ? ownSeatView(myRequestQuery.data) : null
  // F-06.5: the exact place and the contacts go to the organizer and to people
  // with a seat, while the event is on. The server decides again.
  const event = eventQuery.data
  const hasInfoRight =
    user !== null &&
    (ownView === "approved" || ownView === "organizer") &&
    event?.status === "PUBLISHED" &&
    event.endAt > new Date()
  const infoQuery = useQuery({
    ...participantInfoQueryOptions(eventId, user?.id ?? ""),
    enabled: hasInfoRight,
  })

  const queryClient = useQueryClient()
  // A seat taken at once (automatic approval) changes the roster; a request
  // waiting for the organizer does not, but a refusal may mean the event filled
  // up or started meanwhile. Either way the page shows the latest state.
  const refreshEvent = () => queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
  // The sheet lives here, not in the seat panel: sending a request swaps the
  // free seat for the pending request, and the sheet has to survive that.
  const [sheetStep, setSheetStep] = useState<RequestSheetStep | null>(null)

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
            isOrganizerLinked={Boolean(user)}
            groupLink={
              eventQuery.data.group ? (
                <p className="typo-small text-muted-foreground">
                  {t("events.detail.organizedByGroup")}{" "}
                  <Link
                    to="/groups/$groupId"
                    params={{ groupId: eventQuery.data.group.id }}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    {eventQuery.data.group.name}
                  </Link>
                </p>
              ) : null
            }
            shareAction={<ShareEventAction event={eventQuery.data} />}
            organizerActions={
              // F-05.10: only the organizer, and only until the event starts.
              user?.id === eventQuery.data.organizerId &&
              eventQuery.data.status === "PUBLISHED" &&
              eventQuery.data.startAt > new Date() ? (
                <OrganizerActions event={eventQuery.data} />
              ) : null
            }
            participantInfo={
              !hasInfoRight ? undefined : infoQuery.isPending ? (
                <div className="flex justify-center py-4">
                  <Loader
                    variant="seats"
                    label={t("events.detail.where.loading")}
                  />
                </div>
              ) : infoQuery.isError ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("events.detail.where.loadError")}</AlertTitle>
                  <AlertDescription className="flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void infoQuery.refetch()}
                    >
                      {t("events.list.reload")}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <ParticipantInfo
                  info={infoQuery.data}
                  pin={{
                    activity: eventQuery.data.activity.icon,
                    title: eventQuery.data.title,
                    state:
                      missingCount({
                        taken: eventQuery.data.takenCount,
                        min: eventQuery.data.minParticipants,
                      }) > 0
                        ? "missing"
                        : "full",
                  }}
                />
              )
            }
            ownRequest={
              ownView === "organizer" ? (
                <OrganizerPanel eventId={eventId} />
              ) : ownView ? (
                <OwnRequestPanel
                  view={ownView}
                  approvalMode={eventQuery.data.approvalMode}
                  onWithdraw={() => setSheetStep("withdraw")}
                  // F-06.4: any time before the start, as the server says.
                  onCancel={
                    myRequestQuery.data?.cancelViolations.length === 0
                      ? () => setSheetStep("cancel")
                      : undefined
                  }
                  rejoinAction={joinAction}
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
            // What the server says the organizer will see; the session's own
            // fields stand in while it loads or when it failed.
            applicant={
              myRequestQuery.data?.applicant ?? {
                name: user.name,
                image: null,
                bio: null,
                hasVerifiedEmail: user.emailVerified,
              }
            }
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

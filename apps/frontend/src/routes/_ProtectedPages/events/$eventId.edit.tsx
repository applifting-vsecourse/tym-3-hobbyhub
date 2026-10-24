import { useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { NotFound } from "@/components/Error/NotFound"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import type { CreateEventInput, Event } from "@/features/event/api/eventSchemas"
import { manageEventQueryOptions } from "@/features/event/api/manageEventQueryOptions"
import { ChangeWarningDialog } from "@/features/event/components/ChangeWarningDialog"
import { EventForm } from "@/features/event/components/EventForm"
import { useUpdateEvent } from "@/features/event/hooks/useUpdateEvent"

export const Route = createFileRoute("/_ProtectedPages/events/$eventId/edit")({
  component: EditEventPage,
})

// Whether the participants would be surprised: another time or another place.
const changesWhenOrWhere = (event: Event, input: CreateEventInput) =>
  input.startAt !== event.startAt.toISOString() ||
  input.endAt !== event.endAt.toISOString() ||
  input.location?.street !== event.location?.street ||
  input.location?.city !== event.location?.city ||
  input.location?.postalCode !== event.location?.postalCode ||
  input.location?.country !== event.location?.country ||
  (input.location?.placeName ?? null) !== (event.location?.placeName ?? null)

type Pending = {
  readonly values: CreateEventInput
  readonly resolve: () => void
  readonly reject: (reason: unknown) => void
}

function EditEventPage() {
  const { eventId } = Route.useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const eventQuery = useQuery(manageEventQueryOptions(eventId))
  const activitiesQuery = useQuery(activitiesQueryOptions())
  const updateEvent = useUpdateEvent(eventId)
  const pendingRef = useRef<Pending | null>(null)
  const [isWarningOpen, setIsWarningOpen] = useState(false)

  const activityOptions = useMemo(
    () =>
      (activitiesQuery.data ?? []).map((activity) => ({
        id: activity.id,
        label: activityName(t, activity),
        icon: activity.icon,
        defaultMinParticipants: activity.defaultMinParticipants,
        defaultMaxParticipants: activity.defaultMaxParticipants,
      })),
    [activitiesQuery.data, t],
  )

  const goToDetail = () => navigate({ to: "/events/$eventId", params: { eventId } })

  const save = async (values: CreateEventInput) => {
    await updateEvent.mutateAsync(values)
    toast.success(t("events.form.saved"))
    await goToDetail()
  }

  // A failed save throws on purpose: the form then keeps guarding the typed
  // values, and the message comes from the mutation state below.
  const handleSubmit = (values: CreateEventInput) => {
    const event = eventQuery.data
    if (!event || event.approvedCount === 0 || !changesWhenOrWhere(event, values)) {
      return save(values)
    }
    // Participants are not told yet: ask first, and finish the submit with the answer.
    return new Promise<void>((resolve, reject) => {
      pendingRef.current = { values, resolve, reject }
      setIsWarningOpen(true)
    })
  }

  const confirmWarning = () => {
    const pending = pendingRef.current
    if (!pending) return
    // Settled either way: a failed save is shown by the form, not behind the dialog.
    save(pending.values)
      .then(pending.resolve, pending.reject)
      .finally(() => {
        pendingRef.current = null
        setIsWarningOpen(false)
      })
  }

  const backFromWarning = () => {
    pendingRef.current?.reject(new Error("Change not confirmed"))
    pendingRef.current = null
    setIsWarningOpen(false)
  }

  const status = eventQuery.error instanceof HTTPError ? eventQuery.error.response.status : null

  if (status === 404 || status === 403) {
    return (
      <>
        <Seo title={t("events.form.editTitle")} />
        <NotFound />
      </>
    )
  }

  const event = eventQuery.data
  const isLocked =
    event !== undefined &&
    ((event.status !== "PUBLISHED" && event.status !== "DRAFT") || event.startAt <= new Date())

  return (
    <>
      <Seo title={t("events.form.editTitle")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
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
        ) : !event ? null : isLocked ? (
          <Alert>
            <AlertTitle>{t("events.edit.lockedTitle")}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              {t("events.edit.locked")}
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <Link
                  to="/events/$eventId"
                  params={{ eventId }}
                >
                  {t("events.detail.back")}
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <EventForm
              event={event}
              activities={activityOptions}
              isActivitiesLoading={activitiesQuery.isPending}
              isActivitiesError={activitiesQuery.isError}
              onRetryActivities={() => void activitiesQuery.refetch()}
              isSubmitting={updateEvent.isPending}
              errorMessage={updateEvent.isError ? t("events.form.updateFailed") : null}
              onSubmit={handleSubmit}
              cancelAction={
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <Link
                    to="/events/$eventId"
                    params={{ eventId }}
                  >
                    {t("events.form.cancel")}
                  </Link>
                </Button>
              }
            />
            <ChangeWarningDialog
              isOpen={isWarningOpen}
              approvedCount={event.approvedCount}
              isSubmitting={updateEvent.isPending}
              onConfirm={confirmWarning}
              onBack={backFromWarning}
            />
          </>
        )}
      </section>
    </>
  )
}

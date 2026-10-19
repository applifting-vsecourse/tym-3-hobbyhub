import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import type { CreateEventInput } from "@/features/event/api/eventSchemas"
import { EventForm } from "@/features/event/components/EventForm"
import { useCreateEvent } from "@/features/event/hooks/useCreateEvent"

export const Route = createFileRoute("/_ProtectedPages/events/new")({
  component: NewEventPage,
})

function NewEventPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activitiesQuery = useQuery(activitiesQueryOptions())
  const createEvent = useCreateEvent()
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

  const handleSubmit = async (values: CreateEventInput) => {
    try {
      const event = await createEvent.mutateAsync(values)
      toast.success(t("events.form.created"))
      await navigate({ to: "/events/$eventId", params: { eventId: event.id } })
    } catch {
      // Shown in the form from the mutation state; the typed values stay.
    }
  }

  return (
    <>
      <Seo title={t("events.form.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <EventForm
          activities={activityOptions}
          isActivitiesLoading={activitiesQuery.isPending}
          isActivitiesError={activitiesQuery.isError}
          onRetryActivities={() => void activitiesQuery.refetch()}
          isSubmitting={createEvent.isPending}
          errorMessage={createEvent.isError ? t("events.form.createFailed") : null}
          onSubmit={handleSubmit}
          backLink={
            <BackLink
              to={ROUTES.home}
              label={t("events.back")}
            />
          }
          cancelAction={
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Link to={ROUTES.home}>{t("events.form.cancel")}</Link>
            </Button>
          }
        />
      </section>
    </>
  )
}

import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { StatusBadge, type Status } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import type { ApplicationStatus, MyEvents } from "@/features/event/api/myEventsSchemas"
import { EventsLoadError } from "@/features/event/components/EventsLoadError"
import { eventDay, eventMeta, eventTime } from "@/features/event/lib/eventLabels"

const BADGES: Record<ApplicationStatus, Status> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  WITHDRAWN: "neutral",
  EVENT_CANCELLED: "rejected",
}

type MyEventsOverviewProps = {
  data?: MyEvents
  /** Display name of an event's activity; the activity feature owns the translation. */
  activityLabel: (activity: EventListItem["activity"]) => string
  isLoading?: boolean
  error?: Error | null
  onReload?: () => void
  /** Injectable so "today" is stable in tests. */
  now?: Date
}

/** F-06.3: the person's upcoming applications with their state, and the events they organize. */
export function MyEventsOverview({
  data,
  activityLabel,
  isLoading,
  error,
  onReload,
  now = new Date(),
}: MyEventsOverviewProps) {
  const { t, i18n } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader
          variant="player"
          label={t("myEvents.loading")}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <EventsLoadError
        error={error ?? new Error()}
        onRetry={onReload}
      />
    )
  }

  if (data.applications.length === 0 && data.hosted.length === 0) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3"
      >
        <h2 className="typo-h3 text-foreground">{t("myEvents.empty.title")}</h2>
        <p className="typo-body text-muted-foreground">{t("myEvents.empty.description")}</p>
        <Button
          asChild
          className="w-full sm:w-auto"
        >
          <Link to={ROUTES.events}>{t("myEvents.empty.find")}</Link>
        </Button>
      </div>
    )
  }

  const row = (event: EventListItem, status?: ApplicationStatus) => (
    <li key={event.id}>
      <Link
        to="/events/$eventId"
        params={{ eventId: event.id }}
        className="-mx-3 block rounded-lg px-3 transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ScheduleRow
          time={eventTime(event.startAt, i18n.language)}
          title={event.title}
          subtitle={[
            eventDay(t, event.startAt, now, i18n.language),
            eventMeta(t, event, activityLabel(event.activity)),
          ].join(" · ")}
          taken={event.takenCount}
          min={event.minParticipants}
          max={event.maxParticipants}
          // The title next to it says what the photo shows.
          photo={event.imageUrl ? { src: event.imageUrl, alt: "" } : undefined}
          activity={event.activity.icon}
          badge={
            status ? (
              <StatusBadge status={BADGES[status]}>{t(`myEvents.status.${status}`)}</StatusBadge>
            ) : undefined
          }
        />
      </Link>
    </li>
  )

  return (
    <Tabs defaultValue="applications">
      <TabsList
        aria-label={t("myEvents.tabs.label")}
        className="w-full sm:w-fit"
      >
        <TabsTrigger value="applications">
          {t("myEvents.tabs.applications")} ({data.applications.length})
        </TabsTrigger>
        <TabsTrigger value="hosted">
          {t("myEvents.tabs.hosted")} ({data.hosted.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="applications">
        {data.applications.length === 0 ? (
          <p className="mt-4 typo-body text-muted-foreground">{t("myEvents.applications.empty")}</p>
        ) : (
          <ul>{data.applications.map(({ event, status }) => row(event, status))}</ul>
        )}
      </TabsContent>
      <TabsContent value="hosted">
        {data.hosted.length === 0 ? (
          <p className="mt-4 typo-body text-muted-foreground">{t("myEvents.hosted.empty")}</p>
        ) : (
          <ul>{data.hosted.map((event) => row(event))}</ul>
        )}
      </TabsContent>
    </Tabs>
  )
}

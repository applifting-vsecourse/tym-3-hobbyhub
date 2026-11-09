import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { eventKeys } from "@/features/event/api/eventKeys"
import type { EventListItem } from "@/features/event/api/eventSchemas"
import type { MyApplication } from "@/features/event/api/myEventsSchemas"
import type { ApplicationAction } from "@/features/event/components/MyEventsOverview"
import { eventPlaceAndLevel, eventTime } from "@/features/event/lib/eventLabels"
import { CancelParticipationSheet } from "@/features/participation-request/components/CancelParticipationSheet"

/** Which application's sheet is open, and on which step; `step` is null while it is closed. */
export type ApplicationSheetState = {
  eventId: string | null
  step: ApplicationAction | null
}

type ApplicationSheetProps = {
  /** The loaded applications; the sheet shows the current state of the chosen one. */
  applications: MyApplication[]
  state: ApplicationSheetState
  onStepChange: (step: ApplicationAction | null) => void
}

/**
 * #171: the overview row's menu opens the same dialog as the event detail. It
 * stays mounted, so it animates in and out, and it reads the application from
 * the list on every render instead of keeping a copy from when it opened.
 */
export function ApplicationSheet({ applications, state, onStepChange }: ApplicationSheetProps) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  const current =
    applications.find((application) => application.event.id === state.eventId)?.event ?? null
  // The last event shown, for when a refresh drops the row while the sheet
  // animates out: it closes on the event it was about.
  const [lastEvent, setLastEvent] = useState<EventListItem | null>(current)
  if (current && current !== lastEvent) setLastEvent(current)
  const event = current ?? (lastEvent?.id === state.eventId ? lastEvent : null)

  // The seat changes the occupancy and the viewer's sign-up wherever the event
  // shows: its detail, as the detail's own sheet refreshes it, and the lists.
  const refreshEvent = () =>
    event
      ? Promise.all([
          queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) }),
          queryClient.invalidateQueries({ queryKey: eventKeys.lists() }),
        ])
      : Promise.resolve()

  return (
    <CancelParticipationSheet
      eventId={event?.id ?? ""}
      event={{
        title: event?.title ?? "",
        time: event ? eventTime(event.startAt, i18n.language) : "",
        place: event ? eventPlaceAndLevel(t, event) : "",
        taken: event?.takenCount ?? 0,
        min: event?.minParticipants ?? 0,
        max: event?.maxParticipants ?? 0,
      }}
      // Nothing to show before a row was chosen.
      step={event ? state.step : null}
      onStepChange={onStepChange}
      onChange={refreshEvent}
    />
  )
}

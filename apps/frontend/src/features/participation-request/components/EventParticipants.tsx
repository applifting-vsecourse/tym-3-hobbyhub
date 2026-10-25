import { useTranslation } from "react-i18next"

import { missingCount } from "@/components/hobbyhub/capacity"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"

import { PendingRequests } from "@/features/participation-request/components/PendingRequests"
import type { ManagedEvent } from "@/features/participation-request/lib/requestDecision"

type EventParticipantsProps = {
  event: ManagedEvent
  /** Refreshes the event after a decision, e.g. its seat counts. */
  onChange?: () => Promise<unknown>
  /** Injectable so "has started" is stable in tests. */
  now?: Date
}

/**
 * Žádosti a přehled účastníků: the organizer's view of one event. F-05.7
 * fills it with the waiting requests; the participants (F-05.6 #31) and
 * attendance (F-05.11) join them later. A component of its own, so the
 * organizer's overview (wireframe 37) can show it next to the event list.
 */
export function EventParticipants({ event, onChange, now }: EventParticipantsProps) {
  const { t } = useTranslation()
  const missing = missingCount({ taken: event.taken, min: event.min })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="typo-label text-muted-foreground">
          {t("participationRequests.manage.title")}
        </p>
        <h1 className="typo-h1 break-words text-foreground">{event.title}</h1>
        <p className="typo-body text-muted-foreground">{event.when}</p>
      </header>

      <div className="flex flex-col gap-3 rounded-xl bg-signal p-4 text-signal-foreground">
        <RosterSeats
          size="md"
          surface="dark"
          taken={event.taken}
          min={event.min}
          capacity={event.max}
        />
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {missing > 0 ? (
            <span className="typo-h3">
              {t("participationRequests.manage.missingToMin", { count: missing })}
            </span>
          ) : null}
          <span className="typo-small text-signal-soft">
            {t("events.detail.seats", { taken: event.taken, total: event.max })}
          </span>
        </p>
      </div>

      <PendingRequests
        event={event}
        onChange={onChange}
        now={now}
      />
    </div>
  )
}

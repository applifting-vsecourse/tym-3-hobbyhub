import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { missingCount } from "@/components/hobbyhub/capacity"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { StatusBadge, type Status } from "@/components/hobbyhub/StatusBadge"

import { pendingRequestsQueryOptions } from "@/features/participation-request/api/pendingRequestsQueryOptions"
import { DecidedRequests } from "@/features/participation-request/components/DecidedRequests"
import { ExternalSpotsCounter } from "@/features/participation-request/components/ExternalSpotsCounter"
import {
  ParticipantsTabs,
  type ParticipantsTab,
} from "@/features/participation-request/components/ParticipantsTabs"
import { PendingRequests } from "@/features/participation-request/components/PendingRequests"
import {
  decisionLockOf,
  type ManagedEventOverview,
} from "@/features/participation-request/lib/requestDecision"

// DESIGN.md: success is for a reached minimum and a full event; the signal
// surface is kept for the missing count in the band below, so "below minimum"
// is a neutral badge.
const FILL_STATE_BADGE: Record<ManagedEventOverview["fillState"], Status> = {
  BELOW_MINIMUM: "neutral",
  MINIMUM_REACHED: "approved",
  FULL: "approved",
}

type EventParticipantsProps = {
  event: ManagedEventOverview
  tab: ParticipantsTab
  /** Refreshes the event after a decision or a changed number of seats. */
  onChange?: () => Promise<unknown>
  /** Injectable so "has started" is stable in tests. */
  now?: Date
}

/**
 * Žádosti a přehled účastníků: the organizer's view of one event. The waiting
 * requests (F-05.7) and the participants with the other states (F-05.6) are
 * two tabs under one occupancy, which the organizer completes with the seats
 * of people outside the app. Attendance (F-05.11) joins later. A component of
 * its own, so the organizer's overview (wireframe 37) can show it next to the
 * event list.
 */
export function EventParticipants({
  event,
  tab,
  onChange,
  now = new Date(),
}: EventParticipantsProps) {
  const { t } = useTranslation()
  const requestsQuery = useInfiniteQuery(pendingRequestsQueryOptions(event.id))
  const missing = missingCount({ taken: event.taken, min: event.min })
  const isLocked = decisionLockOf(event, now) !== null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="typo-label text-muted-foreground">
          {t("participationRequests.manage.title")}
        </p>
        <h1 className="typo-h1 break-words text-foreground">{event.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="typo-body text-muted-foreground">{event.when}</p>
          <StatusBadge status={FILL_STATE_BADGE[event.fillState]}>
            {t(`participationRequests.manage.fillState.${event.fillState}`)}
          </StatusBadge>
        </div>
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
          <span className="typo-small text-signal-soft">
            {t("participationRequests.manage.breakdown", {
              approved: event.approved,
              external: event.externalOccupied,
            })}
          </span>
        </p>
      </div>

      <ExternalSpotsCounter
        event={event}
        isLocked={isLocked}
        onChange={onChange}
      />

      <ParticipantsTabs
        eventId={event.id}
        active={tab}
        counts={{
          requests: requestsQuery.data?.pages[0]?.total,
          // Everyone with a seat, the people outside the app too.
          participants: event.taken,
        }}
      />

      {tab === "participants" ? (
        <DecidedRequests event={event} />
      ) : (
        <PendingRequests
          event={event}
          onChange={onChange}
          now={now}
        />
      )}
    </div>
  )
}

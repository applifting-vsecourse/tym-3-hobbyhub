import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { JoinRequestCard } from "@/components/hobbyhub/JoinRequestCard"

import { participantsQueryOptions } from "@/features/participation-request/api/participantsQueryOptions"
import {
  PARTICIPANT_STATUSES,
  type SeatStatus,
} from "@/features/participation-request/api/participationRequestSchemas"
import { PagedSection } from "@/features/participation-request/components/PagedSection"
import type { ManagedEventOverview } from "@/features/participation-request/lib/requestDecision"

/**
 * Účastníci (F-05.6, F-06.4): the seats only, never the requests (ADR-0003).
 * Who comes, with the seats outside the app, and who gave their seat back,
 * with their words to the organizers.
 */
export function Participants({ event }: { event: ManagedEventOverview }) {
  return (
    <div className="flex flex-col gap-8">
      {PARTICIPANT_STATUSES.map((status) => (
        <ParticipantsSection
          key={status}
          eventId={event.id}
          status={status}
          externalOccupied={status === "APPROVED" ? event.externalOccupied : 0}
        />
      ))}
    </div>
  )
}

type ParticipantsSectionProps = {
  eventId: string
  status: SeatStatus
  /** Seats outside the app, said under the people who come. */
  externalOccupied: number
}

function ParticipantsSection({ eventId, status, externalOccupied }: ParticipantsSectionProps) {
  const { t, i18n } = useTranslation()
  const query = useInfiniteQuery(participantsQueryOptions(eventId, status))
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" })

  return (
    <PagedSection
      headingId={`participants-${status.toLowerCase()}-heading`}
      query={query}
      texts={{
        title: t(`participationRequests.manage.participants.${status}.title`),
        loading: t(`participationRequests.manage.participants.${status}.loading`),
        loadError: t(`participationRequests.manage.participants.${status}.loadError`),
        empty: t(`participationRequests.manage.participants.${status}.empty`),
        more: (count) => t(`participationRequests.manage.participants.${status}.more`, { count }),
      }}
      subtitle={
        externalOccupied > 0 ? (
          <p className="typo-small text-muted-foreground">
            {t("participationRequests.manage.participants.APPROVED.external", {
              count: externalOccupied,
            })}
          </p>
        ) : null
      }
      getKey={(participant) => participant.id}
      renderItem={(participant) => (
        <JoinRequestCard
          name={participant.person.name}
          photo={participant.person.image}
          hasVerifiedEmail={participant.person.hasVerifiedEmail}
          bio={participant.person.bio}
          message={participant.message}
          note={[
            t(`participationRequests.manage.participants.${status}.since`, {
              date: date.format(participant.changedAt),
            }),
            // Their new request waits on the requests tab.
            participant.asksAgain ? t("participationRequests.manage.participants.asksAgain") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      )}
    />
  )
}

import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { JoinRequestApplicant } from "@/components/hobbyhub/JoinRequestCard"
import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { participantsQueryOptions } from "@/features/participation-request/api/participantsQueryOptions"

type ApprovedParticipantsProps = {
  eventId: string
}

/**
 * Schválení účastníci (F-04.2): who holds a seat on the event. The name opens
 * the person's profile, where the organizer also sees their e-mail.
 */
export function ApprovedParticipants({ eventId }: ApprovedParticipantsProps) {
  const { t } = useTranslation()
  const participantsQuery = useInfiniteQuery(participantsQueryOptions(eventId))
  const items = participantsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const total = participantsQuery.data?.pages[0]?.total ?? 0

  let content
  if (participantsQuery.isPending) {
    content = (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t("participationRequests.manage.loading")}
        />
      </div>
    )
  } else if (participantsQuery.isError && items.length === 0) {
    content = (
      <Alert variant="destructive">
        <AlertTitle>{t("participationRequests.manage.loadError")}</AlertTitle>
        <AlertDescription className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void participantsQuery.refetch()}
          >
            {t("participationRequests.manage.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  } else if (items.length === 0) {
    content = (
      <p className="typo-body text-muted-foreground">
        {t("participationRequests.manage.participantsEmpty")}
      </p>
    )
  } else {
    content = (
      <>
        <ul className="flex flex-col gap-3">
          {items.map((participant) => (
            <li
              key={participant.userId}
              className="rounded-lg border border-border bg-card p-4"
            >
              <JoinRequestApplicant
                profileUserId={participant.userId}
                name={participant.applicant.name}
                photo={participant.applicant.image}
                bio={participant.applicant.bio}
              />
            </li>
          ))}
        </ul>
        {participantsQuery.hasNextPage ? (
          <Button
            variant="outline"
            className="self-center"
            disabled={participantsQuery.isFetchingNextPage}
            onClick={() => void participantsQuery.fetchNextPage()}
          >
            {t("participationRequests.manage.more", { count: total - items.length })}
          </Button>
        ) : null}
      </>
    )
  }

  return (
    <section
      aria-labelledby="participants-heading"
      className="flex flex-col gap-4"
    >
      <h2
        id="participants-heading"
        className="flex items-baseline gap-2 typo-h3 text-foreground"
      >
        {t("participationRequests.manage.participants")}
        {participantsQuery.data ? (
          <span className="typo-body text-muted-foreground">{total}</span>
        ) : null}
      </h2>
      {content}
    </section>
  )
}

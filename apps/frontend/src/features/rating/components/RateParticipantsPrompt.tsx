import { Link } from "@tanstack/react-router"
import { Star } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { EventRatingState, RatingViolation } from "@/features/rating/api/ratingSchemas"
import { isOpenTarget } from "@/features/rating/lib/participantDrafts"

// Reasons that hold for the whole event: then there is nothing to rate there.
const EVENT_VIOLATIONS: RatingViolation[] = [
  "EVENT_NOT_OVER",
  "RATING_CLOSED",
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_HIDDEN",
]

type RateParticipantsPromptProps = {
  /** What the server says the signed-in person may rate at the event. */
  state: EventRatingState
}

/**
 * #235: on the detail of an event that is over, the main organizer's way to
 * rate its participants: until when and how many are left. Once all are
 * rated, that they are. Nothing for anyone else (they get no participants),
 * nor once the rating period is over.
 */
export function RateParticipantsPrompt({ state }: RateParticipantsPromptProps) {
  const { t, i18n } = useTranslation()
  const { participants, event } = state
  const isPeriodOn = participants.every(
    (target) => !target.violations.some((violation) => EVENT_VIOLATIONS.includes(violation)),
  )
  if (participants.length === 0 || !isPeriodOn) return null

  const left = participants.filter(isOpenTarget).length
  if (left === 0) {
    return (
      <p className="typo-body text-muted-foreground">
        {t("events.detail.rating.participantsRated")}{" "}
        <Link
          to="/events/$eventId/ratings"
          params={{ eventId: event.id }}
          className="text-foreground underline underline-offset-4"
        >
          {t("events.detail.rating.show")}
        </Link>
      </p>
    )
  }

  const deadline = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(state.deadline)

  return (
    <div className="flex flex-col items-start gap-3 pt-2">
      <p className="typo-body text-foreground">
        {t("events.detail.rating.participantsPrompt", {
          deadline,
          count: left,
          total: participants.length,
        })}
      </p>
      {/* Outline: the roster card beside it holds the organizer's one primary
        action ("Žádosti a přehled účastníků"). */}
      <Button
        asChild
        variant="outline"
        className="w-full sm:w-auto"
      >
        <Link
          to="/events/$eventId/ratings"
          params={{ eventId: event.id }}
        >
          <Star aria-hidden />
          {t("events.detail.rating.rateParticipants")}
        </Link>
      </Button>
    </div>
  )
}

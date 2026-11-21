import { Link } from "@tanstack/react-router"
import { Star } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { EventRatingState } from "@/features/rating/api/ratingSchemas"

type RateOrganizerPromptProps = {
  /** What the server says the signed-in person may rate at the event. */
  state: EventRatingState
}

/**
 * #234: on the detail of an event that is over, the way to rate its organizer
 * for someone who had a seat: until when, and the one action left on the
 * page. Once they rated, that they did. Nothing for anyone else, nor once the
 * rating period is over.
 */
export function RateOrganizerPrompt({ state }: RateOrganizerPromptProps) {
  const { t, i18n } = useTranslation()
  const { organizer, event } = state
  if (!organizer) return null

  if (organizer.rating) {
    return (
      <p className="typo-body text-muted-foreground">
        {t("events.detail.rating.rated")}{" "}
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
  if (organizer.violations.length > 0) return null

  const deadline = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(state.deadline)

  return (
    <div className="flex flex-col items-start gap-3 pt-2">
      <p className="typo-body text-foreground">{t("events.detail.rating.prompt", { deadline })}</p>
      <Button
        asChild
        className="w-full sm:w-auto"
      >
        <Link
          to="/events/$eventId/ratings"
          params={{ eventId: event.id }}
        >
          <Star aria-hidden />
          {t("events.detail.rating.rate")}
        </Link>
      </Button>
    </div>
  )
}

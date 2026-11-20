import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { RatingStars } from "@/components/hobbyhub/RatingScore"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RATING_STARS_MAX } from "@/lib/ratingScore"

import type {
  EventRatingState,
  RatingInput,
  RatingTarget,
} from "@/features/rating/api/ratingSchemas"
import { RatingForm } from "@/features/rating/components/RatingForm"

type EventRatingsViewProps = {
  state: EventRatingState
  /** Sends the rating of the organizer (#234). Throws when it is not saved. */
  onRateOrganizer: (input: RatingInput) => Promise<void>
  isRatingOrganizer?: boolean
  /** Why the last try was not saved, in the person's language. */
  organizerRatingError?: string | null
}

type Phase = "open" | "notYet" | "closed" | "unavailable"

// Where the rating period stands, read from why the targets may not be rated.
const phaseOf = (state: EventRatingState): Phase => {
  const violations = [state.organizer, ...state.participants].flatMap((target) =>
    target ? target.violations : [],
  )
  if (violations.includes("RATING_CLOSED")) return "closed"
  if (violations.includes("EVENT_NOT_OVER")) return "notYet"
  if (
    violations.some((violation) =>
      ["EVENT_CANCELLED", "EVENT_NOT_HELD", "EVENT_HIDDEN"].includes(violation),
    )
  ) {
    return "unavailable"
  }
  return "open"
}

/**
 * #236: the ratings of one event, as the signed-in person sees them: until
 * when, and whom they may rate, with what they gave. A participant rates the
 * organizer right here (#234); the form for the participants comes with #235,
 * and until then the page says so.
 */
export function EventRatingsView({
  state,
  onRateOrganizer,
  isRatingOrganizer = false,
  organizerRatingError = null,
}: EventRatingsViewProps) {
  const { t, i18n } = useTranslation()
  const deadline = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(state.deadline)
  const phase = phaseOf(state)
  const hasTargets = state.organizer !== null || state.participants.length > 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="typo-label text-muted-foreground">{t("rating.page.eyebrow")}</p>
        <h1 className="typo-h1 text-balance break-words text-foreground">{state.event.title}</h1>
        <p className="typo-body text-foreground">{t(`rating.page.phase.${phase}`, { deadline })}</p>
        {hasTargets && phase === "open" ? (
          <p className="typo-small text-muted-foreground">{t("rating.page.revealNote")}</p>
        ) : null}
      </div>

      {hasTargets ? null : (
        <p className="typo-body text-muted-foreground">{t("rating.page.empty")}</p>
      )}

      {state.organizer ? (
        <OrganizerSection
          organizer={state.organizer}
          isOpen={phase === "open"}
          onRate={onRateOrganizer}
          isRating={isRatingOrganizer}
          error={organizerRatingError}
        />
      ) : null}

      {state.participants.length > 0 ? (
        <TargetSection
          title={t("rating.page.participants")}
          targets={state.participants}
        />
      ) : null}

      {state.participants.length > 0 && phase === "open" ? (
        <p className="typo-small text-muted-foreground">{t("rating.page.formsSoon")}</p>
      ) : null}
    </div>
  )
}

/**
 * #234: the organizer as a participant rates them. The form while they may,
 * then what they sent: a rating is final, so there is nothing to edit.
 */
function OrganizerSection({
  organizer,
  isOpen,
  onRate,
  isRating,
  error,
}: {
  organizer: RatingTarget
  /** The rating period is on. */
  isOpen: boolean
  onRate: (input: RatingInput) => Promise<void>
  isRating: boolean
  error: string | null
}) {
  const { t } = useTranslation()
  const { rating } = organizer
  const canRate = rating === null && organizer.violations.length === 0

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 className="typo-h3 text-foreground">{t("rating.page.organizer")}</h2>
      <ul className="flex flex-col">
        <TargetRow target={organizer} />
      </ul>
      {/* A refusal changes what the page shows (the period ended, the rating
        is there already), so the form may be gone: the reason stays. */}
      {error && !canRate ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {rating?.comment ? (
        <div className="flex flex-col gap-1">
          <p className="typo-label text-muted-foreground">{t("rating.page.yourComment")}</p>
          <p className="max-w-prose typo-body break-words whitespace-pre-line text-foreground">
            {rating.comment}
          </p>
        </div>
      ) : null}
      {rating && isOpen ? (
        <p
          role="status"
          className="typo-small text-muted-foreground"
        >
          {t("rating.page.sent")}
        </p>
      ) : null}
      {canRate ? (
        <RatingForm
          starsLabel={t("rating.page.organizerStarsLabel")}
          isPending={isRating}
          errorMessage={error}
          onSubmit={onRate}
          className="pt-3"
        />
      ) : null}
    </section>
  )
}

function TargetSection({ title, targets }: { title: string; targets: RatingTarget[] }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 className="typo-h3 text-foreground">{title}</h2>
      <ul className="flex flex-col divide-y divide-border">
        {targets.map((target) => (
          <TargetRow
            key={target.user.id}
            target={target}
          />
        ))}
      </ul>
    </section>
  )
}

function TargetRow({ target }: { target: RatingTarget }) {
  const { t } = useTranslation()
  const { user, rating } = target

  return (
    <li className="flex items-center gap-3 py-3">
      <PersonAvatar
        name={user.name}
        size="md"
      />
      <Link
        to="/profile/$userId"
        params={{ userId: user.id }}
        className="min-w-0 flex-1 truncate typo-label-lg text-foreground underline-offset-4 hover:underline"
      >
        {user.name}
      </Link>
      {rating ? (
        <span className="flex items-center gap-2">
          <RatingStars stars={rating.stars} />
          <span className="sr-only">
            {t("rating.starsOf", { count: rating.stars, max: RATING_STARS_MAX })}
          </span>
        </span>
      ) : (
        <span className="typo-small text-muted-foreground">{t("rating.page.notRated")}</span>
      )}
    </li>
  )
}

import { useId } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { RatingStars } from "@/components/hobbyhub/RatingScore"
import { ScrollToTopButton } from "@/components/hobbyhub/ScrollToTopButton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RATING_STARS_MAX } from "@/lib/ratingScore"

import type {
  EventRatingState,
  RatingInput,
  RatingTarget,
} from "@/features/rating/api/ratingSchemas"
import { RateParticipantsForm } from "@/features/rating/components/RateParticipantsForm"
import { RatingForm } from "@/features/rating/components/RatingForm"
import { isOpenTarget, progressOf } from "@/features/rating/lib/participantDrafts"

type EventRatingsViewProps = {
  state: EventRatingState
  /** Sends the rating of the organizer (#234). Throws when it is not saved. */
  onRateOrganizer: (input: RatingInput) => Promise<void>
  isRatingOrganizer?: boolean
  /** Why the last try was not saved, in the person's language. */
  organizerRatingError?: string | null
  /** The main organizer rates one participant (#235). Throws when it is not saved. */
  onRateParticipant?: (participantId: string, input: RatingInput) => Promise<void>
  /** After the organizer sent ratings: the page reads again what is saved. */
  onParticipantsRated?: () => Promise<unknown>
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
 * organizer right here (#234), the main organizer the participants (#235).
 */
export function EventRatingsView({
  state,
  onRateOrganizer,
  isRatingOrganizer = false,
  organizerRatingError = null,
  onRateParticipant = () => Promise.resolve(),
  onParticipantsRated = () => Promise.resolve(),
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
        <ParticipantsSection
          participants={state.participants}
          isOpen={phase === "open"}
          deadline={deadline}
          onRate={onRateParticipant}
          onSent={onParticipantsRated}
        />
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

/**
 * #235: the main organizer and the participants. While the period is on and
 * someone is left, the list to rate them; otherwise what they gave. How far
 * along they are, and the way back up, stay in sight either way.
 */
function ParticipantsSection({
  participants,
  isOpen,
  deadline,
  onRate,
  onSent,
}: {
  participants: RatingTarget[]
  /** The rating period is on. */
  isOpen: boolean
  deadline: string
  onRate: (participantId: string, input: RatingInput) => Promise<void>
  onSent: () => Promise<unknown>
}) {
  const { t } = useTranslation()
  const { rated, total } = progressOf(participants)
  const isLeft = participants.some(isOpenTarget)
  const sectionId = useId()

  return (
    // The way up from a long list brings the section back under the sticky
    // header (h-14, md:h-16), its heading first, and takes focus there.
    <section
      id={sectionId}
      tabIndex={-1}
      aria-labelledby={`${sectionId}-title`}
      className="flex scroll-mt-14 flex-col gap-3 border-t border-border pt-6 outline-none md:scroll-mt-16"
    >
      <h2
        id={`${sectionId}-title`}
        className="typo-h3 text-foreground"
      >
        {t("rating.page.participants")}
      </h2>
      {/* Under the sticky header (h-14, md:h-16), so it stays in sight, with
        the way back up from far down a long list. It stays once everyone is
        rated or the period is over, without the deadline, which no longer
        applies: the list is just as long then. */}
      <div className="sticky top-14 z-20 flex items-center justify-between gap-3 bg-background py-1 md:top-16">
        <p
          role="status"
          className="typo-label text-foreground"
        >
          {t("rating.participants.progress", { rated, total })}
          {isOpen && isLeft ? (
            <span className="text-muted-foreground">
              {" · "}
              {t("rating.participants.until", { deadline })}
            </span>
          ) : null}
        </p>
        <ScrollToTopButton
          targetId={sectionId}
          className="-mr-2 md:mr-0"
        />
      </div>
      {isOpen && isLeft ? (
        <RateParticipantsForm
          participants={participants}
          deadline={deadline}
          onRate={onRate}
          onSent={onSent}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {participants.map((target) => (
            <TargetRow
              key={target.user.id}
              target={target}
              isCommentShown
            />
          ))}
        </ul>
      )}
      {isOpen && !isLeft ? (
        <p
          role="status"
          className="typo-body text-foreground"
        >
          {t("rating.participants.done", { deadline })}
        </p>
      ) : null}
    </section>
  )
}

function TargetRow({
  target,
  isCommentShown = false,
}: {
  target: RatingTarget
  /** Show what the person wrote too (the participants; the organizer's has its own place). */
  isCommentShown?: boolean
}) {
  const { t } = useTranslation()
  const { user, rating } = target

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-3">
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
      </div>
      {isCommentShown && rating?.comment ? (
        <p className="max-w-prose typo-body break-words whitespace-pre-line text-muted-foreground">
          {rating.comment}
        </p>
      ) : null}
    </li>
  )
}

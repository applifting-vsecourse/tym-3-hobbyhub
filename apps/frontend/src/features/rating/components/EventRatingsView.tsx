import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { RatingStars } from "@/components/hobbyhub/RatingScore"
import { RATING_STARS_MAX } from "@/lib/ratingScore"

import type { EventRatingState, RatingTarget } from "@/features/rating/api/ratingSchemas"

type EventRatingsViewProps = {
  state: EventRatingState
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
 * when, and whom they may rate, with what they gave. The forms come with #234
 * (the organizer) and #235 (the participants); until then the page says so.
 */
export function EventRatingsView({ state }: EventRatingsViewProps) {
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
        <TargetSection
          title={t("rating.page.organizer")}
          targets={[state.organizer]}
        />
      ) : null}

      {state.participants.length > 0 ? (
        <TargetSection
          title={t("rating.page.participants")}
          targets={state.participants}
        />
      ) : null}

      {hasTargets && phase === "open" ? (
        <p className="typo-small text-muted-foreground">{t("rating.page.formsSoon")}</p>
      ) : null}
    </div>
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

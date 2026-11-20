import { useId } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { RatingScore } from "@/components/hobbyhub/RatingScore"
import { RATING_MIN_COUNT_TO_SHOW, type UserRatingScores } from "@/lib/ratingScore"

type ProfileRatingsProps = {
  ratings: UserRatingScores
  /** One's own profile: the numbers come even below three ratings, with a word on why others do not see them. */
  isOwn?: boolean
}

/**
 * #236, ADR-0027: the two scores of a person, as an organizer and as a
 * participant, side by side. Separated by a hairline, not boxed (DESIGN.md).
 */
export function ProfileRatings({ ratings, isOwn = false }: ProfileRatingsProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const roles = [
    { key: "asOrganizer", label: t("profile.ratings.asOrganizer"), score: ratings.asOrganizer },
    {
      key: "asParticipant",
      label: t("profile.ratings.asParticipant"),
      score: ratings.asParticipant,
    },
  ] as const

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 border-t border-border pt-6"
    >
      <h2
        id={headingId}
        className="typo-h3 text-foreground"
      >
        {t("profile.ratings.title")}
      </h2>
      <dl className="grid grid-cols-2 divide-x divide-border">
        {roles.map(({ key, label, score }) => (
          <div
            key={key}
            className="flex min-w-0 flex-col gap-1 px-4 first:pl-0 last:pr-0"
          >
            <dt className="typo-label text-muted-foreground">{label}</dt>
            <dd className="flex flex-col gap-1">
              <RatingScore
                average={score.average}
                count={score.count}
              />
              {isOwn && score.count !== null && score.count < RATING_MIN_COUNT_TO_SHOW ? (
                <p className="typo-caption text-muted-foreground">
                  {t("profile.ratings.ownBelowMinimum", {
                    count: score.count,
                    min: RATING_MIN_COUNT_TO_SHOW,
                  })}
                </p>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      {/* #234: who rated them and what they sent themselves; nobody else's. */}
      {isOwn ? (
        <Link
          to={ROUTES.profileRatings}
          className="self-start typo-label text-foreground underline underline-offset-4"
        >
          {t("profile.ratings.showMine")}
        </Link>
      ) : null}
    </section>
  )
}

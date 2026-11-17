import { Star } from "lucide-react"
import { useTranslation } from "react-i18next"

import { RATING_STARS_MAX } from "@/lib/ratingScore"
import { cn } from "@/lib/utils"

const STARS = Array.from({ length: RATING_STARS_MAX }, (_, index) => index + 1)

type RatingStarsProps = {
  /** Whole or fractional stars; rounded to the nearest whole star. */
  stars: number
  className?: string
}

/**
 * Five stars, read-only, the first `stars` filled. Decorative: whoever shows
 * them says the number in words too.
 */
export function RatingStars({ stars, className }: RatingStarsProps) {
  const filled = Math.round(stars)
  return (
    <span
      aria-hidden="true"
      className={cn("flex", className)}
    >
      {STARS.map((star) => (
        <Star
          key={star}
          className={cn(
            "size-4",
            star <= filled ? "fill-current text-foreground" : "text-muted-foreground",
          )}
        />
      ))}
    </span>
  )
}

type RatingScoreProps = {
  /** Unrounded average, or null when there is none to show. */
  average: number | null
  /** Revealed ratings, or null when the viewer may not see it. */
  count: number | null
  className?: string
}

/**
 * A score (#236): stars, the average to tenths and how many ratings, e.g.
 * "4,8 (23)". One graphic carrying numbers, so `role="img"` with the numbers
 * in its name. Without an average, "Zatím málo hodnocení".
 */
export function RatingScore({ average, count, className }: RatingScoreProps) {
  const { t, i18n } = useTranslation()

  if (average === null) {
    return (
      <p className={cn("typo-small text-muted-foreground", className)}>{t("rating.notEnough")}</p>
    )
  }

  const value = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average)

  return (
    <span
      role="img"
      aria-label={
        count === null
          ? t("rating.scoreLabel", { value, max: RATING_STARS_MAX })
          : t("rating.scoreWithCountLabel", { value, max: RATING_STARS_MAX, count })
      }
      className={cn("flex items-center gap-2", className)}
    >
      <RatingStars stars={average} />
      <span className="typo-numeral text-foreground">{value}</span>
      {count === null ? null : <span className="typo-small text-muted-foreground">({count})</span>}
    </span>
  )
}

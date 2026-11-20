import type { TFunction } from "i18next"

import type { RatingViolation } from "@/features/rating/api/ratingSchemas"
import { RatingRefusedError } from "@/features/rating/api/submitRating"

// The event's own reasons first: they hold for everyone, so they explain best.
const REFUSAL_ORDER: RatingViolation[] = [
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_HIDDEN",
  "EVENT_NOT_OVER",
  "RATING_CLOSED",
  "ALREADY_RATED",
  "IS_ORGANIZER",
  "NOT_MAIN_ORGANIZER",
  "PARTICIPANT_IS_ORGANIZER",
  "NO_SEAT",
]

/** The one reason to show for a refused rating, or null when none was given. */
export function ratingRefusalOf(violations: RatingViolation[]): RatingViolation | null {
  return REFUSAL_ORDER.find((violation) => violations.includes(violation)) ?? null
}

/**
 * Why a rating was not saved, in the person's language: the server's reason
 * when it gave one, otherwise that sending failed and may be tried again.
 */
export function ratingErrorMessage(t: TFunction, error: unknown): string {
  const refusal = error instanceof RatingRefusedError ? ratingRefusalOf(error.violations) : null
  return refusal ? t(`rating.refused.${refusal}`) : t("rating.form.failed")
}

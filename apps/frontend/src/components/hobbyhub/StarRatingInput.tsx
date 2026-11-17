import { Star } from "lucide-react"
import { useTranslation } from "react-i18next"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { RATING_STARS_MAX } from "@/lib/ratingScore"
import { cn } from "@/lib/utils"

type StarRatingInputProps = {
  /** Whole stars, or null before anything is chosen. */
  value: number | null
  onValueChange: (stars: number) => void
  /** Id of the visible label of the group. */
  "aria-labelledby": string
  "aria-invalid"?: boolean
  isRequired?: boolean
  isDisabled?: boolean
  className?: string
}

const STARS = Array.from({ length: RATING_STARS_MAX }, (_, index) => index + 1)

/**
 * 1–5 stars (#236). The kit's radio group underneath: one value of five,
 * arrows to move, and a screen reader says "4 z 5". Each radio lies,
 * invisible, over its star and stays in the tab order; the star's circle
 * carries the focus ring. Stars up to the chosen one are filled with
 * `primary`, the person's own choice, like a picked `ActivityToken`. 44 px
 * per star on phones.
 */
export function StarRatingInput({
  value,
  onValueChange,
  "aria-labelledby": labelledBy,
  "aria-invalid": isInvalid,
  isRequired = false,
  isDisabled = false,
  className,
}: StarRatingInputProps) {
  const { t } = useTranslation()

  return (
    <RadioGroup
      value={value === null ? "" : String(value)}
      onValueChange={(next) => onValueChange(Number(next))}
      orientation="horizontal"
      aria-labelledby={labelledBy}
      aria-invalid={isInvalid}
      required={isRequired}
      disabled={isDisabled}
      className={cn("flex gap-0", className)}
    >
      {STARS.map((stars) => {
        const isFilled = value !== null && stars <= value
        return (
          <span
            key={stars}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-full md:size-9",
              "has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
              "has-disabled:opacity-50",
            )}
          >
            <Star
              aria-hidden="true"
              className={cn(
                "pointer-events-none size-7 md:size-6",
                isFilled ? "fill-current text-primary" : "text-muted-foreground",
              )}
            />
            {/* The radio itself lies over the star, invisible: a tap or click
              lands on it, not on a label that iOS Safari would not pass on. */}
            <RadioGroupItem
              value={String(stars)}
              aria-label={t("rating.starsOf", { count: stars, max: RATING_STARS_MAX })}
              className="absolute inset-0 size-full cursor-pointer rounded-full border-0 opacity-0 disabled:cursor-not-allowed"
            />
          </span>
        )
      })}
    </RadioGroup>
  )
}

import { useId, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { StarRatingInput } from "@/components/hobbyhub/StarRatingInput"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { RATING_STARS_MAX } from "@/lib/ratingScore"
import { cn } from "@/lib/utils"

import { RATING_COMMENT_MAX_LENGTH, type RatingInput } from "@/features/rating/api/ratingSchemas"

// Characters as the server and the database count them: code points, after
// the same `trim()` the server does.
const charCount = (value: string) => [...value.trim()].length

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    stars: z
      .number()
      .int()
      .min(1)
      .max(RATING_STARS_MAX)
      .nullable()
      // `: boolean` keeps it a plain check: as a type guard it would narrow
      // what the form holds to a number, and nothing is chosen at first.
      .refine((stars): boolean => stars !== null, { message: t("rating.form.starsRequired") }),
    comment: z.string().refine((comment) => charCount(comment) <= RATING_COMMENT_MAX_LENGTH, {
      message: t("rating.form.commentTooLong", { max: RATING_COMMENT_MAX_LENGTH }),
    }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type RatingFormProps = {
  /** The question above the stars; it says who is rated. */
  starsLabel: string
  isPending: boolean
  /** Why the last try was not saved, in the person's language. */
  errorMessage: string | null
  /** Throws when the rating is not saved, so the form stays filled in and guarded. */
  onSubmit: (input: RatingInput) => Promise<void>
  className?: string
}

/**
 * One rating (#234, #235): 1–5 stars and an optional comment. A sent rating is
 * final, so the form says so next to its button instead of asking twice.
 * Whoever uses it sends the rating and says why it was refused.
 */
export function RatingForm({
  starsLabel,
  isPending,
  errorMessage,
  onSubmit,
  className,
}: RatingFormProps) {
  const { t } = useTranslation()
  const starsLabelId = useId()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stars: null, comment: "" },
  })
  const comment = useWatch({ control: form.control, name: "comment" })
  const left = RATING_COMMENT_MAX_LENGTH - charCount(comment)

  return (
    <AppForm
      form={form}
      onSubmit={async ({ stars, comment: text }) => {
        // The schema refuses a form without stars; this only tells the types.
        if (stars === null) return
        await onSubmit({ stars, comment: text.trim() || undefined })
      }}
      className={cn("flex flex-col gap-6", className)}
    >
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        control={form.control}
        name="stars"
        render={({ field, fieldState }) => (
          <FormItem>
            {/* Not a <label>: it names the whole group of five radios. */}
            <span
              id={starsLabelId}
              className="typo-label-lg text-foreground"
            >
              {starsLabel}
            </span>
            <StarRatingInput
              value={field.value}
              onValueChange={field.onChange}
              aria-labelledby={starsLabelId}
              aria-invalid={fieldState.invalid}
              isRequired
              isDisabled={isPending}
              // The star's circle is wider than the star: pull it to the label's edge.
              className="-ml-2 md:-ml-1"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="comment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("rating.form.commentLabel")}</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder={t("rating.form.commentPlaceholder")}
                disabled={isPending}
                {...field}
              />
            </FormControl>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
              <FormDescription>{t("rating.form.commentHint")}</FormDescription>
              <p
                className={cn(
                  "typo-small",
                  left < 0 ? "text-destructive-ink" : "text-muted-foreground",
                )}
              >
                {left < 0
                  ? t("rating.form.commentOver", { count: -left })
                  : t("rating.form.commentLeft", { count: left })}
              </p>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-col gap-3">
        <p className="typo-small text-muted-foreground">{t("rating.form.finalNote")}</p>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto sm:self-start"
        >
          {isPending ? t("rating.form.submitting") : t("rating.form.submit")}
        </Button>
      </div>
    </AppForm>
  )
}

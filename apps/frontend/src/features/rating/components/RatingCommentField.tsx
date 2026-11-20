import type { FieldPath, FieldValues } from "react-hook-form"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { RATING_COMMENT_MAX_LENGTH } from "@/features/rating/api/ratingSchemas"
import { charCount } from "@/features/rating/lib/ratingComment"

type RatingCommentFieldProps<TFieldValues extends FieldValues> = {
  /** The string field of the surrounding `AppForm` that holds the comment. */
  name: FieldPath<TFieldValues>
  placeholder?: string
  /** A line under the field, e.g. who sees the comment and when. */
  hint?: string
  rows?: number
  isDisabled?: boolean
  className?: string
}

/**
 * The optional comment of a rating (#234, #235), with how many characters are
 * left: the same limit as the server, counted the way the server counts.
 */
export function RatingCommentField<TFieldValues extends FieldValues>({
  name,
  placeholder,
  hint,
  rows = 4,
  isDisabled = false,
  className,
}: RatingCommentFieldProps<TFieldValues>) {
  const { t } = useTranslation()
  const { control } = useFormContext<TFieldValues>()
  const comment = useWatch({ control, name }) as string | undefined
  const left = RATING_COMMENT_MAX_LENGTH - charCount(comment ?? "")

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{t("rating.form.commentLabel")}</FormLabel>
          <FormControl>
            <Textarea
              rows={rows}
              placeholder={placeholder ?? t("rating.form.commentPlaceholder")}
              disabled={isDisabled}
              {...field}
              value={(field.value) ?? ""}
            />
          </FormControl>
          <div className={cn("flex flex-wrap gap-x-4 gap-y-1", hint ? "justify-between" : "justify-end")}>
            {hint ? <FormDescription>{hint}</FormDescription> : null}
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
  )
}

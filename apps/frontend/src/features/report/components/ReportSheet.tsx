import { useEffect, useId, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import {
  REPORT_TEXT_MAX,
  REPORT_TEXT_MIN,
  type ReportReason,
  type ReportTargetType,
} from "@/features/report/api/reportSchemas"

const length = (value: string) => [...value].length

const createSchema = (t: TFunction) =>
  z.object({
    reasonId: z.string().min(1, t("reports.form.reasonRequired")),
    text: z
      .string()
      .trim()
      .refine(
        (value) => length(value) >= REPORT_TEXT_MIN,
        t("reports.form.textTooShort", { count: REPORT_TEXT_MIN }),
      )
      .refine(
        (value) => length(value) <= REPORT_TEXT_MAX,
        t("reports.form.textTooLong", { count: REPORT_TEXT_MAX }),
      ),
  })

export type ReportFormValues = z.input<ReturnType<typeof createSchema>>

type ReportSheetProps = {
  readonly targetType: ReportTargetType
  /** The event's title or the person's name, for the description. */
  readonly targetName: string
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly reasons: ReportReason[]
  readonly isReasonsLoading: boolean
  readonly isReasonsError: boolean
  readonly onRetryReasons: () => void
  readonly isSubmitting: boolean
  readonly errorMessage?: string | null
  /** Throws when the report fails, so the form records it (AppForm). The text comes untrimmed. */
  readonly onSubmit: (values: ReportFormValues) => Promise<void>
}

/**
 * #240, ADR-0023: the reason and what happened, for the administrators only.
 * A report of a person also asks for the two to be blocked from each other.
 */
export function ReportSheet({
  targetType,
  targetName,
  isOpen,
  onOpenChange,
  reasons,
  isReasonsLoading,
  isReasonsError,
  onRetryReasons,
  isSubmitting,
  errorMessage,
  onSubmit,
}: ReportSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reasonId: "", text: "" },
  })
  const kind = targetType === "EVENT" ? "event" : "user"

  // Every opening starts clean, not with what was typed the last time.
  const { reset } = form
  useEffect(() => {
    if (isOpen) reset({ reasonId: "", text: "" })
  }, [isOpen, reset])

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t(`reports.${kind}.title`)}
      description={t(`reports.${kind}.description`, { name: targetName })}
      isFooterScrolling
      footer={
        <>
          <Button
            type="submit"
            form={formId}
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("reports.form.submit")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {t("reports.form.back")}
          </Button>
        </>
      }
    >
      {/* A few sentences, and the sheet closes on its own: no leave-the-page prompt. */}
      <AppForm
        id={formId}
        form={form}
        isGuarded={false}
        className="space-y-4"
        onSubmit={onSubmit}
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {isReasonsError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              {t("reports.form.reasonsFailed")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="max-md:h-11"
                onClick={onRetryReasons}
              >
                {t("reports.form.reasonsRetry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="reasonId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("reports.form.reason")}</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isReasonsLoading}
              >
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    className="w-full"
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder={t("reports.form.reasonPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {reasons.map((reason) => (
                    <SelectItem
                      key={reason.id}
                      value={reason.id}
                    >
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("reports.form.text")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t(`reports.${kind}.textPlaceholder`)}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </AppForm>
    </ResponsiveSheet>
  )
}

import { useMemo, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

import {
  PARTICIPATION_CANCELLATION_MESSAGE_MAX,
  PARTICIPATION_CANCELLATION_MESSAGE_MIN,
} from "@/features/participation-request/api/participationRequestSchemas"

// Characters as the server and the database count them: code points, after
// the same `trim()` the server does.
const charCount = (value: string) => [...value].length

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    message: z
      .string()
      .trim()
      .refine((message) => charCount(message) >= PARTICIPATION_CANCELLATION_MESSAGE_MIN, {
        message: t("participationRequests.cancel.messageTooShort", {
          count: PARTICIPATION_CANCELLATION_MESSAGE_MIN,
        }),
      })
      .refine((message) => charCount(message) <= PARTICIPATION_CANCELLATION_MESSAGE_MAX, {
        message: t("participationRequests.cancel.messageTooLong", {
          count: PARTICIPATION_CANCELLATION_MESSAGE_MAX,
        }),
      }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type CancelParticipationFormProps = {
  formId: string
  /** The event as the sheet shows it, above the form. */
  eventRow: ReactNode
  isPending: boolean
  errorMessage: string | null
  /** Throws when the server refuses, so the form stays dirty and guarded. */
  onSubmit: (message: string) => Promise<void>
}

/**
 * Zrušení účasti (F-06.4): the rule, and the required message to the
 * organizers. The sheet around it holds the buttons.
 */
export function CancelParticipationForm({
  formId,
  eventRow,
  isPending,
  errorMessage,
  onSubmit,
}: CancelParticipationFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  })

  return (
    <div className="flex flex-col gap-4 pb-1">
      <div className="rounded-lg border border-border px-4">{eventRow}</div>
      <p className="rounded-lg bg-muted p-4 typo-body text-foreground">
        {t("participationRequests.cancel.text")}
      </p>
      <AppForm
        id={formId}
        form={form}
        onSubmit={(values) => onSubmit(values.message)}
        className="flex flex-col gap-3"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("participationRequests.cancel.messageLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t("participationRequests.cancel.messagePlaceholder")}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </AppForm>
    </div>
  )
}

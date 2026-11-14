import { useId, useMemo } from "react"
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
import { Textarea } from "@/components/ui/textarea"

import {
  EVENT_HIDDEN_REASON_MAX_LENGTH,
  EVENT_HIDDEN_REASON_MIN_LENGTH,
} from "@/features/admin/api/adminSchemas"
import { EventModerationRefusedError } from "@/features/admin/api/eventModerationMutations"

const createSchema = (t: TFunction) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(EVENT_HIDDEN_REASON_MIN_LENGTH, t("admin.moderation.reasonTooShort"))
      .max(EVENT_HIDDEN_REASON_MAX_LENGTH, t("admin.moderation.reasonTooLong")),
  })

export type HideEventValues = z.infer<ReturnType<typeof createSchema>>

type HideEventSheetProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  isPending: boolean
  error: unknown
  onSubmit: (values: HideEventValues) => Promise<unknown>
}

/** What went wrong, in words: the event may have changed under the administrator. */
export const moderationErrorOf = (t: TFunction, error: unknown): string | null => {
  if (!error) return null
  if (error instanceof EventModerationRefusedError) {
    if (error.violations.includes("EVENT_IS_DRAFT")) return t("admin.moderation.draft")
    return t("admin.moderation.changedMeanwhile")
  }
  return t("admin.moderation.failed")
}

/** #239: hides an event from everyone but its organizers, who read the reason. */
export function HideEventSheet({
  isOpen,
  onOpenChange,
  title,
  isPending,
  error,
  onSubmit,
}: HideEventSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<HideEventValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  })
  const errorMessage = moderationErrorOf(t, error)

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={(isOpening) => {
        if (!isOpening) form.reset()
        onOpenChange(isOpening)
      }}
      title={t("admin.moderation.hideTitle", { title })}
      description={t("admin.moderation.hideDescription")}
      hasCloseButton
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("admin.moderation.hideSubmit")}
        </Button>
      }
    >
      <AppForm
        id={formId}
        form={form}
        onSubmit={async (values) => {
          await onSubmit(values)
          form.reset()
        }}
        // One sentence in a sheet the administrator opened on purpose.
        isGuarded={false}
        className="flex flex-col gap-4 pb-1"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("admin.moderation.reasonLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  maxLength={EVENT_HIDDEN_REASON_MAX_LENGTH}
                  disabled={isPending}
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

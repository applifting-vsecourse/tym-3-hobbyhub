import { useId, useMemo, useState, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { PARTICIPATION_REQUEST_MESSAGE_MAX } from "@/features/participation-request/api/participationRequestSchemas"
import { JoinRefusedError } from "@/features/participation-request/api/requestToJoin"
import { useRequestToJoin } from "@/features/participation-request/hooks/useRequestToJoin"
import { refusalOf } from "@/features/participation-request/lib/joinPanel"

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    message: z
      .string()
      .trim()
      .refine((message) => [...message].length <= PARTICIPATION_REQUEST_MESSAGE_MAX, {
        message: t("participationRequests.form.messageTooLong", {
          count: PARTICIPATION_REQUEST_MESSAGE_MAX,
        }),
      }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type RequestToJoinSheetProps = {
  eventId: string
  /** The button that opens the sheet. */
  trigger: ReactNode
  /** Refreshes the page around the request once it is sent or refused. */
  onChange?: () => Promise<unknown>
}

/** Žádost o účast (F-06.1): an optional message, then the request waits for the organizer. */
export function RequestToJoinSheet({ eventId, trigger, onChange }: RequestToJoinSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const requestToJoin = useRequestToJoin(onChange)
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  })
  const message = useWatch({ control: form.control, name: "message" })
  const length = [...(message ?? "")].length

  const handleOpenChange = (isOpening: boolean) => {
    // A new attempt starts without the error of the last one.
    if (isOpening) requestToJoin.reset()
    setIsOpen(isOpening)
  }

  const handleSubmit = async (values: FormValues) => {
    await requestToJoin.mutateAsync({ eventId, message: values.message || undefined })
    form.reset()
    setIsOpen(false)
    toast.success(t("participationRequests.form.sent"))
  }

  const { error } = requestToJoin
  const refusal = error instanceof JoinRefusedError ? refusalOf(error.violations) : null
  const errorMessage = error
    ? refusal
      ? t(`participationRequests.refused.${refusal}`)
      : t("participationRequests.form.sendFailed")
    : null

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={t("participationRequests.form.title")}
      description={t("participationRequests.form.description")}
      footer={
        <Button
          type="submit"
          form={formId}
          disabled={requestToJoin.isPending}
        >
          {requestToJoin.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("participationRequests.form.submit")}
        </Button>
      }
    >
      <AppForm
        id={formId}
        form={form}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 pb-1"
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
              <FormLabel>{t("participationRequests.form.messageLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t("participationRequests.form.messagePlaceholder")}
                  disabled={requestToJoin.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p
          className={cn(
            "self-end typo-small",
            length > PARTICIPATION_REQUEST_MESSAGE_MAX
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {t("participationRequests.form.counter", {
            length,
            max: PARTICIPATION_REQUEST_MESSAGE_MAX,
          })}
        </p>
      </AppForm>
    </ResponsiveSheet>
  )
}

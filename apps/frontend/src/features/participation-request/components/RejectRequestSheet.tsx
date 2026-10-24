import { useId, useMemo, useState } from "react"
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
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

import {
  PARTICIPATION_REQUEST_REJECTION_REASON_MAX,
  type PendingRequest,
} from "@/features/participation-request/api/participationRequestSchemas"

// Characters as the server and the database count them: code points.
const charCount = (value: string) => [...value].length

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    reason: z
      .string()
      .trim()
      .refine((reason) => charCount(reason) <= PARTICIPATION_REQUEST_REJECTION_REASON_MAX, {
        message: t("participationRequests.reject.reasonTooLong", {
          count: PARTICIPATION_REQUEST_REJECTION_REASON_MAX,
        }),
      }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type RejectFormProps = {
  formId: string
  applicantName: string
  isPending: boolean
  errorMessage: string | null
  onSubmit: (reason: string | undefined) => Promise<void>
}

function RejectForm({ formId, applicantName, isPending, errorMessage, onSubmit }: RejectFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  })

  return (
    <div className="flex flex-col gap-4 pb-1">
      {/* ADR-0013: a rejection is final for the event. */}
      <p className="rounded-lg bg-muted p-4 typo-body text-foreground">
        {t("participationRequests.reject.warning", { name: applicantName })}
      </p>
      <AppForm
        id={formId}
        form={form}
        onSubmit={(values) => onSubmit(values.reason || undefined)}
        className="flex flex-col gap-3"
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
              <FormLabel>{t("participationRequests.reject.reasonLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder={t("participationRequests.reject.reasonPlaceholder")}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>{t("participationRequests.reject.reasonHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </AppForm>
    </div>
  )
}

type RejectRequestSheetProps = {
  /** The request being rejected; null when the sheet is closed. */
  request: PendingRequest | null
  isPending: boolean
  /** Why the last attempt failed, from the page's mutation. */
  errorMessage: string | null
  /** Throws when the rejection fails, so the form keeps the typed reason. */
  onConfirm: (reason: string | undefined) => Promise<void>
  onClose: () => void
}

/** Zamítnutí žádosti (F-05.7): an optional reason, and a warning that it is final. */
export function RejectRequestSheet({
  request,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: RejectRequestSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  // While the sheet animates out, it keeps showing the request it closed on.
  const [shown, setShown] = useState(request)
  if (request !== null && request !== shown) setShown(request)

  return (
    <ResponsiveSheet
      isOpen={request !== null}
      onOpenChange={(isOpening) => {
        if (!isOpening) onClose()
      }}
      title={t("participationRequests.reject.title")}
      hasCloseButton
      // The reason field must stay above the buttons with the keyboard open.
      isFooterScrolling
      footer={
        <>
          <Button
            type="submit"
            form={formId}
            variant="destructive"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("participationRequests.reject.confirm")}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            {t("participationRequests.reject.cancel")}
          </Button>
        </>
      }
    >
      {shown ? (
        // A form per request: a reason typed for one never carries over.
        <RejectForm
          key={shown.id}
          formId={formId}
          applicantName={shown.applicant.name}
          isPending={isPending}
          errorMessage={errorMessage}
          onSubmit={onConfirm}
        />
      ) : null}
    </ResponsiveSheet>
  )
}

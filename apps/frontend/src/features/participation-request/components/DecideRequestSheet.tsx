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
  PARTICIPATION_REQUEST_DECISION_MESSAGE_MAX,
  type PendingRequest,
} from "@/features/participation-request/api/participationRequestSchemas"

export type RequestDecision = "approve" | "reject"

// Characters as the server and the database count them: code points.
const charCount = (value: string) => [...value].length

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    message: z
      .string()
      .trim()
      .refine((message) => charCount(message) <= PARTICIPATION_REQUEST_DECISION_MESSAGE_MAX, {
        message: t("participationRequests.decision.messageTooLong", {
          count: PARTICIPATION_REQUEST_DECISION_MESSAGE_MAX,
        }),
      }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type DecideFormProps = {
  formId: string
  decision: RequestDecision
  applicantName: string
  isPending: boolean
  errorMessage: string | null
  onSubmit: (message: string | undefined) => Promise<void>
}

function DecideForm({
  formId,
  decision,
  applicantName,
  isPending,
  errorMessage,
  onSubmit,
}: DecideFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  })

  return (
    <div className="flex flex-col gap-4 pb-1">
      {/* ADR-0013: a rejection is final for the event. */}
      <p className="rounded-lg bg-muted p-4 typo-body text-foreground">
        {t(`participationRequests.${decision}.text`, { name: applicantName })}
      </p>
      <AppForm
        id={formId}
        form={form}
        onSubmit={(values) => onSubmit(values.message || undefined)}
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
              <FormLabel>{t("participationRequests.decision.messageLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder={t(`participationRequests.${decision}.messagePlaceholder`)}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>{t("participationRequests.decision.messageHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </AppForm>
    </div>
  )
}

type DecideRequestSheetProps = {
  /** The request being decided and how; null when the sheet is closed. */
  deciding: { request: PendingRequest; decision: RequestDecision } | null
  isPending: boolean
  /** Why the last attempt failed, from the page's mutation. */
  errorMessage: string | null
  /** Throws when the decision fails, so the form keeps the typed message. */
  onConfirm: (message: string | undefined) => Promise<void>
  onClose: () => void
}

/**
 * Schválení nebo zamítnutí žádosti (F-05.7, #153): an optional message for the
 * applicant either way, and on a rejection a warning that it is final.
 */
export function DecideRequestSheet({
  deciding,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: DecideRequestSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  // While the sheet animates out, it keeps showing the request it closed on.
  const [shown, setShown] = useState(deciding)
  if (deciding !== null && deciding !== shown) setShown(deciding)
  const decision = shown?.decision ?? "reject"

  return (
    <ResponsiveSheet
      isOpen={deciding !== null}
      onOpenChange={(isOpening) => {
        if (!isOpening) onClose()
      }}
      title={t(`participationRequests.${decision}.title`)}
      hasCloseButton
      // The message field must stay above the buttons with the keyboard open.
      isFooterScrolling
      footer={
        <>
          <Button
            type="submit"
            form={formId}
            variant={decision === "reject" ? "destructive" : "default"}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(`participationRequests.${decision}.confirm`)}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            {t(`participationRequests.${decision}.cancel`)}
          </Button>
        </>
      }
    >
      {shown ? (
        // A form per request and decision: a message typed for one never
        // carries over.
        <DecideForm
          key={`${shown.request.id}-${shown.decision}`}
          formId={formId}
          decision={shown.decision}
          applicantName={shown.request.applicant.name}
          isPending={isPending}
          errorMessage={errorMessage}
          onSubmit={onConfirm}
        />
      ) : null}
    </ResponsiveSheet>
  )
}

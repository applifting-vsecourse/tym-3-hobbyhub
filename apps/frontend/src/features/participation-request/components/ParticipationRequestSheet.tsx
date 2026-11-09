import { useEffect, useId, useMemo, useState, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AppForm } from "@/components/form/AppForm"
import { JoinRequestApplicant } from "@/components/hobbyhub/JoinRequestCard"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
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
  PARTICIPATION_REQUEST_MESSAGE_MAX,
  type ApplicantProfile,
  type ApprovalMode,
} from "@/features/participation-request/api/participationRequestSchemas"
import { JoinRefusedError } from "@/features/participation-request/api/requestToJoin"
import {
  CancelParticipationSheet,
  isSeatSheetStep,
  type SeatSheetStep,
} from "@/features/participation-request/components/CancelParticipationSheet"
import {
  RequestedEventRow,
  type RequestedEvent,
} from "@/features/participation-request/components/RequestedEventRow"
import { useRequestToJoin } from "@/features/participation-request/hooks/useRequestToJoin"
import { refusalOf } from "@/features/participation-request/lib/joinPanel"

export type { RequestedEvent }

/**
 * `form` asks, `sent` confirms a request waiting for the organizer, `joined`
 * confirms a seat taken at once (automatic approval). `withdraw` and `cancel`
 * are the two ways out, which `CancelParticipationSheet` shows.
 */
export type RequestSheetStep = "form" | "sent" | "joined" | SeatSheetStep

type RequestStep = Exclude<RequestSheetStep, SeatSheetStep>

// Characters as the server and the database count them: code points, so an
// emoji is one, and a line break is one too. `trim()` is the server's as well.
const charCount = (value: string) => [...value].length

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    message: z
      .string()
      .trim()
      .refine((message) => charCount(message) <= PARTICIPATION_REQUEST_MESSAGE_MAX, {
        message: t("participationRequests.form.messageTooLong", {
          count: PARTICIPATION_REQUEST_MESSAGE_MAX,
        }),
      }),
  })

type FormValues = z.infer<ReturnType<typeof createSchema>>

type RequestFormProps = {
  formId: string
  event: RequestedEvent
  applicant: ApplicantProfile
  approvalMode: ApprovalMode
  isPending: boolean
  errorMessage: string | null
  onSubmit: (message: string | undefined) => Promise<void>
}

function RequestForm({
  formId,
  event,
  applicant,
  approvalMode,
  isPending,
  errorMessage,
  onSubmit,
}: RequestFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  })

  return (
    <div className="flex flex-col gap-4 pb-1">
      <div className="rounded-lg border border-border px-4">
        <RequestedEventRow event={event} />
      </div>

      <section className="flex flex-col gap-3 rounded-lg bg-muted p-4">
        <h3 className="typo-small text-muted-foreground">
          {t("participationRequests.form.organizerSees")}
        </h3>
        {/* The same block the organizer's list shows (F-05.7). */}
        <JoinRequestApplicant
          name={applicant.name}
          photo={applicant.image}
          hasVerifiedEmail={applicant.hasVerifiedEmail}
          bio={applicant.bio}
        />
        <p className="typo-small text-muted-foreground">
          {t("participationRequests.form.hiddenDetails")}
        </p>
      </section>

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
              <FormLabel>{t("participationRequests.form.messageLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t("participationRequests.form.messagePlaceholder")}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              {/* F-08.1: one message with the request; anything else is
                  arranged through the organizer's contact (F-06.5) — after
                  approval, or straight away when seats are automatic. */}
              <FormDescription>
                {t(
                  approvalMode === "AUTOMATIC"
                    ? "participationRequests.form.messageHintAutomatic"
                    : "participationRequests.form.messageHint",
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="typo-small text-muted-foreground">
          {t(
            approvalMode === "AUTOMATIC"
              ? "participationRequests.form.noteAutomatic"
              : "participationRequests.form.note",
          )}
        </p>
        {/* F-06.4: the rule for cancelling, before the person commits. */}
        <p className="typo-small text-muted-foreground">{t("participationRequests.cancelRule")}</p>
      </AppForm>
    </div>
  )
}

/** The confirmation after sending: the roster, what happens next and the request's state. */
function SentView({
  event,
  text,
  status,
}: {
  event: RequestedEvent
  text: string
  status: "pending" | "approved"
}) {
  return (
    <div className="flex flex-col items-center gap-4 pb-1 text-center">
      <RosterSeats
        size="md"
        taken={event.taken}
        min={event.min}
        capacity={event.max}
      />
      <p className="typo-body text-muted-foreground">{text}</p>
      <div className="flex w-full flex-col items-start rounded-lg border border-border px-4 pt-3 text-left">
        <StatusBadge status={status} />
        <RequestedEventRow event={event} />
      </div>
    </div>
  )
}

type ParticipationRequestSheetProps = {
  eventId: string
  event: RequestedEvent
  /** What the organizer will see of the applicant. */
  applicant: ApplicantProfile
  /** AUTOMATIC takes the seat on sending (F-05.5); MANUAL waits for the organizer. */
  approvalMode: ApprovalMode
  /** Which step is open; null when the sheet is closed. */
  step: RequestSheetStep | null
  onStepChange: (step: RequestSheetStep | null) => void
  /** Refreshes the page around the request once it is sent, refused or withdrawn. */
  onChange?: () => Promise<unknown>
}

/**
 * Žádost o účast (F-06.1): ask with an optional message, see it sent, and
 * confirm withdrawing it. Zrušení účasti (F-06.4): give the seat back with a
 * required message to the organizers. With automatic approval the same form takes the seat
 * at once (F-05.5). The page owns the sheet, so it stays open while the seat
 * panel under it switches to the pending request or the seat.
 */
export function ParticipationRequestSheet({
  eventId,
  event,
  applicant,
  approvalMode,
  step,
  onStepChange,
  onChange,
}: ParticipationRequestSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  const requestToJoin = useRequestToJoin(onChange)
  // The way out is its own sheet, shared with the overview of applications (#171).
  const requestStep = step !== null && !isSeatSheetStep(step) ? step : null
  // While the sheet animates out, it keeps showing the step it closed on.
  const [shownStep, setShownStep] = useState<RequestStep>(requestStep ?? "form")
  if (requestStep !== null && requestStep !== shownStep) setShownStep(requestStep)

  // A new attempt starts without the error of the last one.
  const { reset: resetRequest } = requestToJoin
  useEffect(() => {
    if (step === "form") resetRequest()
  }, [step, resetRequest])

  const close = () => onStepChange(null)

  const isAutomatic = approvalMode === "AUTOMATIC"

  // The server says which it was: approved means the seat is taken.
  const send = async (message: string | undefined) => {
    const request = await requestToJoin.mutateAsync({ eventId, message })
    onStepChange(request.status === "APPROVED" ? "joined" : "sent")
  }

  const { error } = requestToJoin
  const refusal = error instanceof JoinRefusedError ? refusalOf(error.violations) : null
  const errorMessage = error
    ? refusal
      ? t(`participationRequests.refused.${refusal}`)
      : t(
          isAutomatic
            ? "participationRequests.form.sendFailedAutomatic"
            : "participationRequests.form.sendFailed",
        )
    : null

  const steps: Record<RequestStep, { title: string; body: ReactNode; footer: ReactNode }> = {
    form: {
      title: t(
        isAutomatic
          ? "participationRequests.form.titleAutomatic"
          : "participationRequests.form.title",
      ),
      body: (
        <RequestForm
          formId={formId}
          event={event}
          applicant={applicant}
          approvalMode={approvalMode}
          isPending={requestToJoin.isPending}
          errorMessage={errorMessage}
          onSubmit={send}
        />
      ),
      footer: (
        <>
          <Button
            type="submit"
            form={formId}
            disabled={requestToJoin.isPending}
          >
            {requestToJoin.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t(
              isAutomatic
                ? "participationRequests.form.submitAutomatic"
                : "participationRequests.form.submit",
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={close}
          >
            {t("participationRequests.form.cancel")}
          </Button>
        </>
      ),
    },
    sent: {
      title: t("participationRequests.sent.title"),
      body: (
        <SentView
          event={event}
          text={t("participationRequests.sent.text")}
          status="pending"
        />
      ),
      footer: (
        <>
          <Button asChild>
            <Link to={ROUTES.events}>{t("participationRequests.sent.findMore")}</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => onStepChange("withdraw")}
          >
            {t("participationRequests.sent.withdraw")}
          </Button>
        </>
      ),
    },
    joined: {
      title: t("participationRequests.joined.title"),
      body: (
        <SentView
          event={event}
          text={t("participationRequests.joined.text")}
          status="approved"
        />
      ),
      footer: (
        <>
          <Button asChild>
            <Link to={ROUTES.events}>{t("participationRequests.sent.findMore")}</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={close}
          >
            {t("participationRequests.joined.close")}
          </Button>
        </>
      ),
    },
  }
  const shown = steps[shownStep]

  return (
    <>
      <ResponsiveSheet
        isOpen={requestStep !== null}
        onOpenChange={(isOpening) => {
          if (!isOpening) close()
        }}
        title={shown.title}
        footer={shown.footer}
        hasCloseButton
        // The form has the message field; its buttons must not cover it.
        isFooterScrolling={shownStep === "form"}
      >
        {shown.body}
      </ResponsiveSheet>
      <CancelParticipationSheet
        eventId={eventId}
        event={event}
        step={step !== null && isSeatSheetStep(step) ? step : null}
        onStepChange={onStepChange}
        onChange={onChange}
      />
    </>
  )
}

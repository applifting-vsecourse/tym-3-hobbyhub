import { useEffect, useId, useMemo, useState, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AppForm } from "@/components/form/AppForm"
import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { RosterSeats } from "@/components/hobbyhub/RosterSeats"
import { ScheduleRow } from "@/components/hobbyhub/ScheduleRow"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

import { PARTICIPATION_REQUEST_MESSAGE_MAX } from "@/features/participation-request/api/participationRequestSchemas"
import { JoinRefusedError } from "@/features/participation-request/api/requestToJoin"
import { useRequestToJoin } from "@/features/participation-request/hooks/useRequestToJoin"
import { useWithdrawRequest } from "@/features/participation-request/hooks/useWithdrawRequest"
import { refusalOf } from "@/features/participation-request/lib/joinPanel"

/** The event as the sheet shows it: one schedule row. */
export type RequestedEvent = {
  title: string
  /** Start time, e.g. "19:00". */
  time: string
  /** Place and level, e.g. "ZŠ Kobylisy, Praha 8, Pokročilí". */
  place: string
  taken: number
  min: number
  max: number
}

/** What the organizer learns about the applicant. */
export type Applicant = {
  name: string
  isEmailVerified: boolean
}

/** `form` asks, `sent` confirms the request, `withdraw` confirms taking it back. */
export type RequestSheetStep = "form" | "sent" | "withdraw"

function EventRow({ event }: { event: RequestedEvent }) {
  return (
    <ScheduleRow
      time={event.time}
      title={event.title}
      subtitle={event.place}
      taken={event.taken}
      min={event.min}
      max={event.max}
      className="border-t-0"
    />
  )
}

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

type RequestFormProps = {
  formId: string
  event: RequestedEvent
  applicant: Applicant
  isPending: boolean
  errorMessage: string | null
  onSubmit: (message: string | undefined) => Promise<void>
}

function RequestForm({
  formId,
  event,
  applicant,
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
        <EventRow event={event} />
      </div>

      <section className="flex flex-col gap-3 rounded-lg bg-muted p-4">
        <h3 className="typo-small text-muted-foreground">
          {t("participationRequests.form.organizerSees")}
        </h3>
        <div className="flex items-center gap-3">
          <ActivityAvatar
            avatar="open"
            size="md"
          />
          <div className="flex min-w-0 flex-col">
            <p className="typo-title text-foreground">{applicant.name}</p>
            <p className="typo-small text-muted-foreground">
              {t(
                applicant.isEmailVerified
                  ? "participationRequests.form.profileVerified"
                  : "participationRequests.form.profileBasic",
              )}
            </p>
          </div>
        </div>
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
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="typo-small text-muted-foreground">{t("participationRequests.form.note")}</p>
      </AppForm>
    </div>
  )
}

function SentView({ event }: { event: RequestedEvent }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 pb-1 text-center">
      <RosterSeats
        size="md"
        taken={event.taken}
        min={event.min}
        capacity={event.max}
      />
      <p className="typo-body text-muted-foreground">{t("participationRequests.sent.text")}</p>
      <div className="flex w-full flex-col items-start rounded-lg border border-border px-4 pt-3 text-left">
        <StatusBadge status="pending" />
        <EventRow event={event} />
      </div>
    </div>
  )
}

type ParticipationRequestSheetProps = {
  eventId: string
  event: RequestedEvent
  applicant: Applicant
  /** Which step is open; null when the sheet is closed. */
  step: RequestSheetStep | null
  onStepChange: (step: RequestSheetStep | null) => void
  /** Refreshes the page around the request once it is sent, refused or withdrawn. */
  onChange?: () => Promise<unknown>
}

/**
 * Žádost o účast (F-06.1): ask with an optional message, see it sent, and
 * confirm withdrawing it. The page owns the sheet, so it stays open while the
 * seat panel under it switches to the pending request.
 */
export function ParticipationRequestSheet({
  eventId,
  event,
  applicant,
  step,
  onStepChange,
  onChange,
}: ParticipationRequestSheetProps) {
  const { t } = useTranslation()
  const formId = useId()
  const requestToJoin = useRequestToJoin(onChange)
  const withdraw = useWithdrawRequest(onChange)
  // While the sheet animates out, it keeps showing the step it closed on.
  const [shownStep, setShownStep] = useState<RequestSheetStep>(step ?? "form")
  if (step !== null && step !== shownStep) setShownStep(step)

  // A new attempt starts without the error of the last one.
  const { reset: resetRequest } = requestToJoin
  useEffect(() => {
    if (step === "form") resetRequest()
  }, [step, resetRequest])

  const close = () => onStepChange(null)

  const send = async (message: string | undefined) => {
    await requestToJoin.mutateAsync({ eventId, message })
    onStepChange("sent")
  }

  const confirmWithdraw = async () => {
    try {
      await withdraw.mutateAsync(eventId)
      close()
      toast.success(t("participationRequests.withdraw.done"))
    } catch {
      toast.error(t("participationRequests.withdraw.failed"))
    }
  }

  const { error } = requestToJoin
  const refusal = error instanceof JoinRefusedError ? refusalOf(error.violations) : null
  const errorMessage = error
    ? refusal
      ? t(`participationRequests.refused.${refusal}`)
      : t("participationRequests.form.sendFailed")
    : null

  const steps: Record<RequestSheetStep, { title: string; body: ReactNode; footer: ReactNode }> = {
    form: {
      title: t("participationRequests.form.title"),
      body: (
        <RequestForm
          formId={formId}
          event={event}
          applicant={applicant}
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
            {t("participationRequests.form.submit")}
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
      body: <SentView event={event} />,
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
    withdraw: {
      title: t("participationRequests.withdraw.title"),
      body: (
        <div className="flex flex-col gap-4 pb-1">
          <div className="rounded-lg border border-border px-4">
            <EventRow event={event} />
          </div>
          <p className="rounded-lg bg-muted p-4 typo-body text-foreground">
            {t("participationRequests.withdraw.text")}
          </p>
        </div>
      ),
      footer: (
        <>
          <Button onClick={close}>{t("participationRequests.withdraw.keep")}</Button>
          <Button
            variant="outline"
            disabled={withdraw.isPending}
            onClick={() => void confirmWithdraw()}
          >
            {withdraw.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("participationRequests.withdraw.confirm")}
          </Button>
        </>
      ),
    },
  }
  const shown = steps[shownStep]

  return (
    <ResponsiveSheet
      isOpen={step !== null}
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
  )
}

import { useEffect, useId, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import { CancelRefusedError } from "@/features/participation-request/api/cancelParticipation"
import { CancelParticipationForm } from "@/features/participation-request/components/CancelParticipationForm"
import {
  RequestedEventRow,
  type RequestedEvent,
} from "@/features/participation-request/components/RequestedEventRow"
import { useCancelParticipation } from "@/features/participation-request/hooks/useCancelParticipation"
import { useWithdrawRequest } from "@/features/participation-request/hooks/useWithdrawRequest"

/**
 * `withdraw` confirms taking a waiting request back (F-06.1), `cancel` gives
 * the seat back with a message to the organizers (F-06.4).
 */
export type SeatSheetStep = "withdraw" | "cancel"

export const isSeatSheetStep = (step: string | null): step is SeatSheetStep =>
  step === "withdraw" || step === "cancel"

type CancelParticipationSheetProps = {
  eventId: string
  event: RequestedEvent
  /** Which step is open; null when the sheet is closed. */
  step: SeatSheetStep | null
  onStepChange: (step: SeatSheetStep | null) => void
  /** Refreshes the page around the seat once it was given back or the request withdrawn. */
  onChange?: () => Promise<unknown>
}

/**
 * The two ways out of an event: withdrawing a request the organizer has not
 * decided yet, and cancelling a seat (F-06.4). Opened from the event detail
 * and from the "my events" overview (#171), so the page owns the step.
 */
export function CancelParticipationSheet({
  eventId,
  event,
  step,
  onStepChange,
  onChange,
}: CancelParticipationSheetProps) {
  const { t } = useTranslation()
  const cancelFormId = useId()
  const withdraw = useWithdrawRequest(onChange)
  const cancelSeat = useCancelParticipation(onChange)
  // While the sheet animates out, it keeps showing the step it closed on.
  const [shownStep, setShownStep] = useState<SeatSheetStep>(step ?? "cancel")
  if (step !== null && step !== shownStep) setShownStep(step)

  // A new attempt starts without the error of the last one.
  const { reset: resetCancel } = cancelSeat
  useEffect(() => {
    if (step === "cancel") resetCancel()
  }, [step, resetCancel])

  const close = () => onStepChange(null)

  const confirmWithdraw = async () => {
    try {
      await withdraw.mutateAsync(eventId)
      close()
      toast.success(t("participationRequests.withdraw.done"))
    } catch {
      toast.error(t("participationRequests.withdraw.failed"))
    }
  }

  // Throws on failure, so the form keeps its text and stays guarded.
  const confirmCancel = async (message: string) => {
    await cancelSeat.mutateAsync({ eventId, message })
    close()
    toast.success(t("participationRequests.cancel.done"))
  }

  const cancelRefusal =
    cancelSeat.error instanceof CancelRefusedError
      ? (cancelSeat.error.violations.find((violation) => violation !== "NO_SEAT") ?? "NO_SEAT")
      : null
  const cancelErrorMessage = cancelSeat.error
    ? cancelRefusal
      ? t(`participationRequests.cancel.refused.${cancelRefusal}`)
      : t("participationRequests.cancel.failed")
    : null

  const steps: Record<SeatSheetStep, { title: string; body: ReactNode; footer: ReactNode }> = {
    withdraw: {
      title: t("participationRequests.withdraw.title"),
      body: (
        <div className="flex flex-col gap-4 pb-1">
          <div className="rounded-lg border border-border px-4">
            <RequestedEventRow event={event} />
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
    cancel: {
      title: t("participationRequests.cancel.title"),
      body: (
        <CancelParticipationForm
          formId={cancelFormId}
          eventRow={<RequestedEventRow event={event} />}
          isPending={cancelSeat.isPending}
          errorMessage={cancelErrorMessage}
          onSubmit={confirmCancel}
        />
      ),
      footer: (
        <>
          <Button onClick={close}>{t("participationRequests.cancel.keep")}</Button>
          <Button
            type="submit"
            form={cancelFormId}
            variant="outline"
            disabled={cancelSeat.isPending}
          >
            {cancelSeat.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("participationRequests.cancel.confirm")}
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
      isFooterScrolling={shownStep === "cancel"}
    >
      {shown.body}
    </ResponsiveSheet>
  )
}

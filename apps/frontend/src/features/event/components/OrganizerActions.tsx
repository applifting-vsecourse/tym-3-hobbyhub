import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import type { CancelEventInput, EventDetail } from "@/features/event/api/eventSchemas"
import { CancelEventDialog } from "@/features/event/components/CancelEventDialog"
import { useCancellationReasons } from "@/features/event/hooks/useCancellationReasons"
import { useCancelEvent } from "@/features/event/hooks/useUpdateEvent"

type OrganizerActionsProps = {
  readonly event: Pick<EventDetail, "id">
}

/** Edit and cancel of an event that has not started; the page decides when to show it. */
export function OrganizerActions({ event }: OrganizerActionsProps) {
  const { t } = useTranslation()
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const reasonsQuery = useCancellationReasons(isCancelOpen)
  const cancelEvent = useCancelEvent(event.id)

  const handleCancel = async (values: CancelEventInput) => {
    await cancelEvent.mutateAsync(values)
    setIsCancelOpen(false)
    toast.success(t("events.cancel.done"))
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        asChild
        variant="outline"
      >
        <Link
          to="/events/$eventId/edit"
          params={{ eventId: event.id }}
        >
          {t("events.manage.edit")}
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          cancelEvent.reset()
          setIsCancelOpen(true)
        }}
      >
        {t("events.manage.cancel")}
      </Button>
      <CancelEventDialog
        isOpen={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        reasons={reasonsQuery.data ?? []}
        isReasonsLoading={reasonsQuery.isPending}
        isReasonsError={reasonsQuery.isError}
        onRetryReasons={() => void reasonsQuery.refetch()}
        isSubmitting={cancelEvent.isPending}
        errorMessage={cancelEvent.isError ? t("events.cancel.failed") : null}
        onSubmit={handleCancel}
      />
    </div>
  )
}

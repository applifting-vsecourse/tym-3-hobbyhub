import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Counter } from "@/components/hobbyhub/Counter"

import { ExternalSpotsRefusedError } from "@/features/participation-request/api/updateExternalSpots"
import { useUpdateExternalSpots } from "@/features/participation-request/hooks/useUpdateExternalSpots"
import type { ManagedEventOverview } from "@/features/participation-request/lib/requestDecision"

/** How long the counter waits after the last change before saving it. */
export const EXTERNAL_SPOTS_SAVE_DELAY_MS = 600

type ExternalSpotsCounterProps = {
  event: ManagedEventOverview
  /** The event has started or closed: the number is only shown. */
  isLocked: boolean
  /** Refreshes the event after a save, e.g. its seat counts. */
  onChange?: () => Promise<unknown>
}

/**
 * Místa mimo aplikaci (F-05.6): the organizer's own party, people without an
 * account. Saved shortly after the last change, so three clicks on plus or
 * typing "12" is one save, not one per step. Never above what the approved
 * participants leave free.
 */
export function ExternalSpotsCounter({ event, isLocked, onChange }: ExternalSpotsCounterProps) {
  const { t } = useTranslation()
  const { mutate } = useUpdateExternalSpots(event.id, onChange)
  // The number shown while it waits to be saved; null shows the saved one.
  const [draft, setDraft] = useState<number | null>(null)
  const saved = event.externalOccupied

  useEffect(() => {
    if (draft === null) return
    const timer = window.setTimeout(() => {
      // The draft settles only if nothing changed it since.
      const settle = () => setDraft((current) => (current === draft ? null : current))
      if (draft === saved) {
        settle()
        return
      }
      mutate(draft, {
        onSuccess: settle,
        onError: (error) => {
          settle()
          toast.error(
            error instanceof ExternalSpotsRefusedError
              ? t(
                  `participationRequests.manage.external.refused.${error.violations[0] ?? "MAX_BELOW_OCCUPIED"}`,
                )
              : t("participationRequests.manage.external.saveFailed"),
          )
        },
      })
    }, EXTERNAL_SPOTS_SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [draft, saved, mutate, t])

  if (isLocked) {
    return (
      <p className="typo-body text-muted-foreground">
        {t("participationRequests.manage.external.locked", { count: saved })}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Counter
        label={t("participationRequests.manage.external.label")}
        value={draft ?? saved}
        onValueChange={setDraft}
        min={0}
        max={Math.max(event.max - event.approved, 0)}
      />
      <p className="typo-small text-muted-foreground">
        {t("participationRequests.manage.external.hint")}
      </p>
    </div>
  )
}

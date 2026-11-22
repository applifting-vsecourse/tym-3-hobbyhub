import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { myEventsKeys } from "@/lib/my-events-keys"

import { removeEventInterest } from "@/features/event-interest/api/eventInterest"
import { eventInterestKeys } from "@/features/event-interest/api/eventInterestKeys"

/**
 * #231: "Odebrat ze seznamu" with a way back. The row leaves the list at once
 * and a toast offers "Vrátit"; the server hears about it only once the toast
 * is gone. So undoing needs no second request, and works for an event that is
 * over or was called off, which could not be saved again.
 *
 * The removal is sent when the toast closes by itself or is dismissed, or
 * when the page goes away (the overview unmounts, the tab closes). A failure
 * brings the row back and says so.
 */
export function useRemoveFromInterestList() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  // Rows on their way out: hidden from the list until the server agrees.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set())
  // What sends each pending removal; the page flushes them when it goes away.
  const pendingRef = useRef(new Map<string, (shouldKeepAlive?: boolean) => void>())

  const show = useCallback((eventId: string) => {
    setHiddenIds((ids) => {
      const next = new Set(ids)
      next.delete(eventId)
      return next
    })
  }, [])

  const remove = useCallback(
    (eventId: string) => {
      setHiddenIds((ids) => new Set(ids).add(eventId))
      let isSettled = false
      const commit = (shouldKeepAlive = false) => {
        if (isSettled) return
        isSettled = true
        pendingRef.current.delete(eventId)
        void removeEventInterest(eventId, { shouldKeepAlive })
          .then(() =>
            // The list loses the row before it shows again, so it does not flash.
            Promise.all([
              queryClient.invalidateQueries({ queryKey: myEventsKeys.interestedAll() }),
              queryClient.invalidateQueries({ queryKey: eventInterestKeys.all() }),
            ]),
          )
          .catch(() => {
            toast.error(t("interest.removeError"))
          })
          .finally(() => show(eventId))
      }
      const undo = () => {
        if (isSettled) return
        isSettled = true
        pendingRef.current.delete(eventId)
        show(eventId)
      }
      pendingRef.current.set(eventId, commit)
      toast(t("interest.removed"), {
        id: `interest-removed-${eventId}`,
        // Twice sonner's default, so there is time to read it and reach "Vrátit".
        duration: 8000,
        action: { label: t("interest.undo"), onClick: undo },
        onAutoClose: () => commit(),
        onDismiss: () => commit(),
      })
    },
    [queryClient, show, t],
  )

  useEffect(() => {
    const pending = pendingRef.current
    const flush = () => {
      for (const commit of [...pending.values()]) commit(true)
    }
    window.addEventListener("pagehide", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [])

  return { hiddenIds, remove }
}

import { useMutation } from "@tanstack/react-query"

import { updateExternalSpots } from "@/features/participation-request/api/updateExternalSpots"

/**
 * Saves the seats outside the app. `onChange` refreshes the event the page
 * shows; the save counts as done once it has, so the counter never shows the
 * old number in between. A refused save refreshes it too: the seats changed.
 */
export function useUpdateExternalSpots(eventId: string, onChange?: () => Promise<unknown>) {
  return useMutation({
    mutationFn: async (externalOccupiedSpots: number) => {
      try {
        await updateExternalSpots(eventId, externalOccupiedSpots)
      } finally {
        await onChange?.()
      }
    },
  })
}

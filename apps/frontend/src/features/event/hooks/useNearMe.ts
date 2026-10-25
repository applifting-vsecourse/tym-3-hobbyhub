import { useCallback, useState } from "react"

import type { NearPoint } from "@/features/event/api/eventKeys"

export type NearMeStatus = "idle" | "locating" | "granted" | "denied" | "unavailable"

// About 100 m: enough to sort by distance, and a small step does not refetch.
const round = (degrees: number) => Math.round(degrees * 1000) / 1000

const LOCATE_TIMEOUT_MS = 10_000
const MAX_POSITION_AGE_MS = 60_000

/**
 * The visitor's position, asked for only when they choose "nearest first" —
 * never on load. Kept in memory only: leaving the page forgets it.
 */
export function useNearMe() {
  const [status, setStatus] = useState<NearMeStatus>("idle")
  const [position, setPosition] = useState<NearPoint | null>(null)

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable")
      return
    }
    setStatus("locating")
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: round(coords.latitude), longitude: round(coords.longitude) })
        setStatus("granted")
      },
      (error) => {
        setPosition(null)
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable")
      },
      { timeout: LOCATE_TIMEOUT_MS, maximumAge: MAX_POSITION_AGE_MS },
    )
  }, [])

  const clear = useCallback(() => {
    setPosition(null)
    setStatus("idle")
  }, [])

  return { status, position, request, clear }
}

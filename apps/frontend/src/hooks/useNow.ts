import { useEffect, useState } from "react"

const MINUTE_MS = 60_000

/**
 * The current time, renewed every `intervalMs` (a minute by default). For what
 * changes as time passes on a page left open, e.g. an action offered only
 * until an event starts.
 */
export function useNow(intervalMs = MINUTE_MS): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}

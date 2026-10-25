import { useCallback, useEffect, useRef, useState } from "react"

/** How long a request stays open before the user is "accepted" (F-02.5). */
export const JOIN_REQUEST_SECONDS = 10

/**
 * A stand-in for the real membership request (F-07.3 #48): nothing is sent or
 * stored, nobody is told. The request counts down, can be withdrawn meanwhile,
 * and then the user is "accepted" until the page is left or reloaded.
 */
export function useJoinRequest() {
  const [isPending, setIsPending] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(JOIN_REQUEST_SECONDS)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }, [])

  useEffect(() => stop, [stop])

  const request = useCallback(() => {
    stop()
    let left = JOIN_REQUEST_SECONDS
    setSecondsLeft(left)
    setIsPending(true)
    timer.current = setInterval(() => {
      left -= 1
      setSecondsLeft(left)
      if (left <= 0) stop()
    }, 1000)
  }, [stop])

  const cancel = useCallback(() => {
    stop()
    setIsPending(false)
  }, [stop])

  const state: "idle" | "pending" | "accepted" = !isPending
    ? "idle"
    : secondsLeft > 0
      ? "pending"
      : "accepted"

  return { state, secondsLeft, request, cancel }
}

export type JoinRequest = ReturnType<typeof useJoinRequest>

import { RESEND_COOLDOWN_SECONDS } from "@/features/auth/lib/verifyEmailUrl"

// When each address may be sent to again. Outside the component, so the wait
// survives closing the sheet it is shown in: reopening it must not offer a
// button the server would answer with "too many attempts".
const endsAt = new Map<string, number>()

const keyOf = (email: string) => email.trim().toLowerCase()

/** The wait starts now, for the full minute. */
export function startResendCooldown(email: string, now: number = Date.now()) {
  endsAt.set(keyOf(email), now + RESEND_COOLDOWN_SECONDS * 1000)
}

/** Forgets every wait, for tests that share this module. */
export function clearResendCooldowns() {
  endsAt.clear()
}

/** Whole seconds still to wait, 0 when sending is possible. */
export function resendSecondsLeft(email: string, now: number = Date.now()) {
  const end = endsAt.get(keyOf(email))
  if (end === undefined) return 0
  return Math.max(0, Math.ceil((end - now) / 1000))
}

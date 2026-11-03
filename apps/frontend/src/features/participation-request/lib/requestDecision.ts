import type { TFunction } from "i18next"

import type { Capacity } from "@/components/hobbyhub/capacity"

import type {
  ApprovalMode,
  DecisionRuleViolation,
} from "@/features/participation-request/api/participationRequestSchemas"

/** The event as deciding its requests needs it; the page maps it from the event detail. */
export type ManagedEvent = {
  id: string
  title: string
  /** When it starts, already formatted, e.g. "Dnes 19:00". */
  when: string
  status: "PUBLISHED" | "CANCELLED" | "FINISHED" | "NOT_HELD"
  startAt: Date
  endAt: Date
  approvalMode: ApprovalMode
  taken: number
  min: number
  max: number
}

/** Why no request of the event can be decided any more. */
export type DecisionLock = Extract<
  DecisionRuleViolation,
  "EVENT_CANCELLED" | "EVENT_NOT_HELD" | "EVENT_FINISHED" | "EVENT_STARTED"
>

/**
 * Requests are decided until the event starts (F-05.7), the boundary of asking
 * too. The same states as the event detail, decided the same way; the server
 * is the one that counts.
 */
export function decisionLockOf(
  event: Pick<ManagedEvent, "status" | "startAt" | "endAt">,
  now: Date,
): DecisionLock | null {
  if (event.status === "CANCELLED") return "EVENT_CANCELLED"
  if (event.status === "NOT_HELD") return "EVENT_NOT_HELD"
  if (event.status !== "PUBLISHED" || event.endAt < now) return "EVENT_FINISHED"
  if (event.startAt <= now) return "EVENT_STARTED"
  return null
}

/** Approval takes a seat, so a full event can only reject. */
export function isFull({ taken, max = 0 }: Capacity) {
  return taken >= max
}

/** What approving one more person changes, said under the request's buttons. */
export function approvalOutcome(t: TFunction, { taken, min, max = min }: Capacity) {
  if (taken >= max) return t("participationRequests.manage.outcome.full")
  const after = taken + 1
  if (after >= max) return t("participationRequests.manage.outcome.fills", { taken: after, max })
  if (after === min) {
    return t("participationRequests.manage.outcome.minimumReached", { taken: after, min })
  }
  if (after < min) {
    return t("participationRequests.manage.outcome.missing", {
      taken: after,
      min,
      count: min - after,
    })
  }
  return t("participationRequests.manage.outcome.taken", { taken: after, max })
}

// The event's own reasons first: they hold for every request on it.
const REFUSAL_ORDER: DecisionRuleViolation[] = [
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_FINISHED",
  "EVENT_STARTED",
  "NOT_PENDING",
  "EVENT_FULL",
  "APPLICANT_HAS_SEAT",
]

/** The one reason to show for a refused decision. */
export function decisionRefusalOf(violations: DecisionRuleViolation[]): DecisionRuleViolation {
  return REFUSAL_ORDER.find((violation) => violations.includes(violation)) ?? "NOT_PENDING"
}

/** The message for a refused decision: a locked event says so the same way as the page. */
export function decisionRefusalMessage(t: TFunction, violations: DecisionRuleViolation[]) {
  const refusal = decisionRefusalOf(violations)
  switch (refusal) {
    case "EVENT_CANCELLED":
    case "EVENT_NOT_HELD":
    case "EVENT_FINISHED":
    case "EVENT_STARTED":
      return t(`participationRequests.manage.locked.${refusal}`)
    default:
      return t(`participationRequests.manage.refused.${refusal}`)
  }
}

import type {
  JoinRuleViolation,
  MyRequestState,
} from "@/features/participation-request/api/participationRequestSchemas"

/** What the seat panel shows instead of the free seat: the person's own place in the event. */
export type OwnSeatView = "organizer" | "pending" | "approved" | "cancelled" | "rejected"

export function ownSeatView({ request, violations, seat }: MyRequestState): OwnSeatView | null {
  if (violations.includes("IS_ORGANIZER")) return "organizer"
  if (request?.status === "PENDING") return "pending"
  if (violations.includes("HAS_SEAT")) return "approved"
  if (request?.status === "REJECTED") return "rejected"
  // F-06.4: the seat says it, not the request. The approval stays after the
  // seat was given back (ADR-0017), and a seat may have had no request at all.
  if (seat === "CANCELLED") return "cancelled"
  if (request?.status === "APPROVED") return "approved"
  return null
}

// The event's own reasons first: they hold for everyone, so they explain best.
const REFUSAL_ORDER: JoinRuleViolation[] = [
  "EVENT_CANCELLED",
  "EVENT_NOT_HELD",
  "EVENT_FINISHED",
  "EVENT_STARTED",
  "EVENT_FULL",
  "IS_ORGANIZER",
  "HAS_SEAT",
  "ALREADY_REQUESTED",
  "REJECTED_BEFORE",
]

/** The one reason to show for a refused request, or null when asking is allowed. */
export function refusalOf(violations: JoinRuleViolation[]): JoinRuleViolation | null {
  return REFUSAL_ORDER.find((violation) => violations.includes(violation)) ?? null
}

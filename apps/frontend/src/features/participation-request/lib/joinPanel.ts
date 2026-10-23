import type {
  JoinRuleViolation,
  MyRequestState,
} from "@/features/participation-request/api/participationRequestSchemas"

/** What the seat panel shows instead of the free seat: the person's own place in the event. */
export type OwnSeatView = "organizer" | "pending" | "approved" | "rejected"

export function ownSeatView({ request, violations }: MyRequestState): OwnSeatView | null {
  if (violations.includes("IS_ORGANIZER")) return "organizer"
  if (request?.status === "PENDING") return "pending"
  if (violations.includes("HAS_SEAT") || request?.status === "APPROVED") return "approved"
  if (request?.status === "REJECTED") return "rejected"
  return null
}

// The event's own reasons first: they hold for everyone, so they explain best.
const REFUSAL_ORDER: JoinRuleViolation[] = [
  "EVENT_CANCELLED",
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

import { describe, expect, it } from "vitest"

import type {
  MyRequestState,
  RequestStatus,
} from "@/features/participation-request/api/participationRequestSchemas"
import {
  decisionMessageOf,
  ownSeatView,
  refusalOf,
} from "@/features/participation-request/lib/joinPanel"

const state = (
  status: RequestStatus | null,
  violations: MyRequestState["violations"] = [],
  seat: MyRequestState["seat"] = null,
  decisionMessage: string | null = null,
): MyRequestState => ({
  request: status
    ? {
        id: "r1",
        eventId: "e1",
        status,
        message: null,
        requestedAt: new Date(),
        decisionMessage,
      }
    : null,
  violations,
  seat,
  cancelViolations: [],
  applicant: { name: "Honza", image: null, bio: null, hasVerifiedEmail: true },
})

// #153: what the organizer wrote with the decision.
describe("decisionMessageOf", () => {
  it.each([
    state("APPROVED", ["HAS_SEAT"], "APPROVED", "Vítej"),
    state("REJECTED", ["REJECTED_BEFORE"], null, "Vítej"),
  ])("quotes the decision the panel shows", (given) => {
    expect(decisionMessageOf(given, ownSeatView(given))).toBe("Vítej")
  })

  it.each([
    // The seat was given back: the approval is history.
    state("APPROVED", [], "CANCELLED", "Vítej"),
    // A new request waits; the old decision no longer counts.
    state("PENDING", ["ALREADY_REQUESTED"], "CANCELLED", null),
    state("APPROVED", ["HAS_SEAT"], "APPROVED", null),
  ])("quotes nothing otherwise", (given) => {
    expect(decisionMessageOf(given, ownSeatView(given))).toBeNull()
  })
})

describe("ownSeatView", () => {
  it("shows the free seat to someone without a request", () => {
    expect(ownSeatView(state(null))).toBeNull()
    expect(ownSeatView(state("WITHDRAWN"))).toBeNull()
  })

  it.each([
    ["pending", state("PENDING", ["ALREADY_REQUESTED"])],
    ["rejected", state("REJECTED", ["REJECTED_BEFORE"])],
    ["approved", state("APPROVED", ["HAS_SEAT"])],
    ["approved", state(null, ["HAS_SEAT"])],
    ["approved", state("APPROVED", ["HAS_SEAT"], "APPROVED")],
    // F-06.4: the approval stays after the seat was given back.
    ["cancelled", state("APPROVED", [], "CANCELLED")],
    ["cancelled", state("APPROVED", ["EVENT_STARTED"], "CANCELLED")],
    // A seat without a request (added by hand, the demo data).
    ["cancelled", state(null, [], "CANCELLED")],
    ["organizer", state(null, ["IS_ORGANIZER"])],
  ] as const)("shows %s", (view, given) => {
    expect(ownSeatView(given)).toBe(view)
  })

  // A new request after a cancelled seat is the one that counts.
  it("shows a new request asked after cancelling", () => {
    expect(ownSeatView(state("PENDING", ["ALREADY_REQUESTED"], "CANCELLED"))).toBe("pending")
    expect(ownSeatView(state("REJECTED", ["REJECTED_BEFORE"], "CANCELLED"))).toBe("rejected")
  })

  // A pending request stays visible on a full event, so it can be withdrawn.
  it("keeps a pending request when the event fills up", () => {
    expect(ownSeatView(state("PENDING", ["EVENT_FULL", "ALREADY_REQUESTED"]))).toBe("pending")
  })
})

describe("refusalOf", () => {
  it("allows asking with no violations", () => {
    expect(refusalOf([])).toBeNull()
  })

  it("explains the event's own reason first", () => {
    expect(refusalOf(["REJECTED_BEFORE", "EVENT_FULL"])).toBe("EVENT_FULL")
    expect(refusalOf(["HAS_SEAT", "EVENT_NOT_HELD"])).toBe("EVENT_NOT_HELD")
    expect(refusalOf(["IS_ORGANIZER", "EVENT_FINISHED"])).toBe("EVENT_FINISHED")
  })
})

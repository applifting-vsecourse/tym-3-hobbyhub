import { describe, expect, it } from "vitest"

import type {
  MyRequestState,
  RequestStatus,
} from "@/features/participation-request/api/participationRequestSchemas"
import { ownSeatView, refusalOf } from "@/features/participation-request/lib/joinPanel"

const state = (
  status: RequestStatus | null,
  violations: MyRequestState["violations"] = [],
): MyRequestState => ({
  request: status
    ? { id: "r1", eventId: "e1", status, message: null, requestedAt: new Date() }
    : null,
  violations,
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
    ["organizer", state(null, ["IS_ORGANIZER"])],
  ] as const)("shows %s", (view, given) => {
    expect(ownSeatView(given)).toBe(view)
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
  })
})

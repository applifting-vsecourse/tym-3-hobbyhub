import { describe, expect, it } from "vitest"

import { i18n } from "@/i18n"

import {
  approvalOutcome,
  decisionLockOf,
  decisionRefusalMessage,
} from "@/features/participation-request/lib/requestDecision"

const t = i18n.t.bind(i18n)
const now = new Date("2030-01-01T12:00:00Z")

const anEvent = (overrides: Partial<Parameters<typeof decisionLockOf>[0]> = {}) => ({
  status: "PUBLISHED" as const,
  startAt: new Date("2030-01-01T18:00:00Z"),
  endAt: new Date("2030-01-01T20:00:00Z"),
  ...overrides,
})

describe("decisionLockOf", () => {
  it("lets the organizer decide before the event starts", () => {
    expect(decisionLockOf(anEvent(), now)).toBeNull()
  })

  it.each([
    ["has started", { startAt: now }, "EVENT_STARTED"],
    ["is over", { status: "FINISHED" as const }, "EVENT_FINISHED"],
    ["was cancelled", { status: "CANCELLED" as const }, "EVENT_CANCELLED"],
    ["did not happen", { status: "NOT_HELD" as const }, "EVENT_NOT_HELD"],
  ])("locks the requests once the event %s", (_, override, lock) => {
    expect(decisionLockOf(anEvent(override), now)).toBe(lock)
  })
})

describe("approvalOutcome", () => {
  it.each([
    [
      "reaching the minimum",
      { taken: 7, min: 8, max: 12 },
      "Po schválení bude minimum splněno (8 z 8).",
    ],
    [
      "still below the minimum",
      { taken: 5, min: 8, max: 12 },
      "Po schválení: 6 z min. 8, do minima chybí 2.",
    ],
    ["above the minimum", { taken: 9, min: 8, max: 12 }, "Po schválení bude obsazeno 10 z 12."],
    ["the last seat", { taken: 11, min: 8, max: 12 }, "Po schválení bude akce plná (12 z 12)."],
    ["a full event", { taken: 12, min: 8, max: 12 }, "Akce je plná, žádost jde jen zamítnout."],
  ])("says what approval changes when %s", (_, capacity, text) => {
    expect(approvalOutcome(t, capacity)).toBe(text)
  })
})

describe("decisionRefusalMessage", () => {
  it("explains a locked event first", () => {
    expect(decisionRefusalMessage(t, ["EVENT_FULL", "EVENT_STARTED"])).toBe(
      "Akce už začala, žádosti už nejde vyřídit.",
    )
  })

  it("says a request decided meanwhile is no longer current", () => {
    expect(decisionRefusalMessage(t, ["NOT_PENDING"])).toBe("Žádost už není aktuální.")
  })
})

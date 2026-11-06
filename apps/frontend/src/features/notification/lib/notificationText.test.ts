import { describe, expect, it } from "vitest"

import { i18n } from "@/i18n"

import type { Notification } from "@/features/notification/api/notificationSchemas"
import { notificationTarget, notificationText } from "@/features/notification/lib/notificationText"

const aNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "n1",
  type: "NEW_REQUESTS",
  createdAt: new Date("2030-01-01T12:00:00Z"),
  readAt: null,
  actor: { id: "u2", name: "Honza_K" },
  event: { id: "e1", title: "Čtvrteční florbal" },
  group: null,
  decision: null,
  message: null,
  changes: [],
  ...overrides,
})

const inGroup = (overrides: Partial<Notification> = {}): Notification =>
  aNotification({ event: null, group: { id: "g1", name: "Florbalisté" }, ...overrides })

describe("notificationText", () => {
  it.each([
    [
      "a request to join an event",
      aNotification(),
      "Honza_K žádá o účast na akci Čtvrteční florbal",
    ],
    ["a request to join a group", inGroup(), "Honza_K žádá o členství ve skupině Florbalisté"],
    [
      "an approved request",
      aNotification({ type: "REQUEST_DECIDED", decision: "APPROVED" }),
      "Tvoje žádost o účast na akci Čtvrteční florbal byla schválena",
    ],
    [
      "a rejected membership",
      inGroup({ type: "REQUEST_DECIDED", decision: "REJECTED" }),
      "Tvoje žádost o členství ve skupině Florbalisté byla zamítnuta",
    ],
    [
      "a moved time",
      aNotification({ type: "EVENT_CHANGED", changes: ["TIME"] }),
      "Akce Čtvrteční florbal má nový čas",
    ],
    [
      "a moved time and place",
      aNotification({ type: "EVENT_CHANGED", changes: ["TIME", "PLACE"] }),
      "Akce Čtvrteční florbal má nový čas i místo",
    ],
    [
      "a cancelled event",
      aNotification({ type: "EVENT_CANCELLED" }),
      "Akce Čtvrteční florbal byla zrušena",
    ],
    [
      "a participant who cancelled (F-06.4)",
      aNotification({ type: "PARTICIPANT_CANCELLED", message: "Onemocněl jsem." }),
      "Honza_K zrušil svoji účast na akci Čtvrteční florbal",
    ],
    [
      "a type without words of its own",
      aNotification({ type: "SPOT_AVAILABLE" }),
      "Novinka k Čtvrteční florbal",
    ],
  ])("says %s in Czech", (_, notification, expected) => {
    expect(notificationText(i18n.t, notification)).toBe(expected)
  })

  it("stands in for a deleted author", () => {
    expect(notificationText(i18n.t, aNotification({ actor: null }))).toBe(
      "Někdo žádá o účast na akci Čtvrteční florbal",
    )
  })

  it("follows the language", async () => {
    await i18n.changeLanguage("en")
    expect(notificationText(i18n.t, aNotification({ type: "EVENT_CANCELLED" }))).toBe(
      "The event Čtvrteční florbal was cancelled",
    )
    await i18n.changeLanguage("cs")
  })
})

describe("notificationTarget", () => {
  it("sends the organizer to the requests of the event", () => {
    expect(notificationTarget(aNotification())).toEqual({ kind: "eventRequests", eventId: "e1" })
  })

  it("sends the admin to the requests of the group", () => {
    expect(notificationTarget(inGroup())).toEqual({ kind: "groupRequests", groupId: "g1" })
  })

  // F-06.4: the organizer goes to the event too, not to its requests.
  it.each([
    "REQUEST_DECIDED",
    "EVENT_CHANGED",
    "EVENT_CANCELLED",
    "PARTICIPANT_CANCELLED",
  ] as const)("sends the participant to the event for %s", (type) => {
    expect(notificationTarget(aNotification({ type }))).toEqual({ kind: "event", eventId: "e1" })
  })

  it("sends the applicant to the group once decided", () => {
    expect(notificationTarget(inGroup({ type: "REQUEST_DECIDED" }))).toEqual({
      kind: "group",
      groupId: "g1",
    })
  })

  it("leads nowhere once the event is gone", () => {
    expect(notificationTarget(aNotification({ event: null }))).toBeNull()
  })
})

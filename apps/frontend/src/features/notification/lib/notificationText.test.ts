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
  friendRequest: null,
  decision: null,
  message: null,
  changes: [],
  reason: null,
  reminder: null,
  ratingPrompt: null,
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
      "Honza_K zrušil(a) svoji účast na akci Čtvrteční florbal",
    ],
    [
      "an event hidden from its participant (#239)",
      aNotification({ type: "EVENT_HIDDEN", actor: null }),
      "Akce Čtvrteční florbal byla odstraněna správcem",
    ],
    [
      "an event hidden from its organizer (#239)",
      aNotification({ type: "EVENT_HIDDEN", actor: null, reason: "Nabízí placené služby." }),
      "Správce skryl tvoji akci Čtvrteční florbal",
    ],
    [
      "an event brought back (#239)",
      aNotification({ type: "EVENT_RESTORED", actor: null }),
      "Akce Čtvrteční florbal je zpět",
    ],
    [
      "a report dealt with, naming neither the target nor the outcome (#240)",
      aNotification({ type: "REPORT_RESOLVED", actor: null, event: null }),
      "Tvoje nahlášení jsme vyřídili. Děkujeme, že pomáháš udržet HobbyHub bezpečný.",
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

  // #233: the day and time as the reader sees them now, in local time.
  describe("a reminder before the start", () => {
    const startsAt = new Date(2030, 0, 2, 18, 0)
    const dayBefore = new Date(2030, 0, 1, 18, 5)
    const sameDay = new Date(2030, 0, 2, 16, 5)
    const occupancy = { occupiedSpots: 7, maxParticipants: 12, missingToMinimum: 0 }
    const reminderOf = (
      type: "EVENT_REMINDER" | "HOSTED_EVENT_REMINDER",
      overrides: Partial<NonNullable<Notification["reminder"]>> = {},
    ) =>
      aNotification({
        type,
        actor: null,
        reminder: {
          kind: "DAY",
          startsAt,
          occupancy: type === "HOSTED_EVENT_REMINDER" ? occupancy : null,
          ...overrides,
        },
      })

    it.each([
      ["a day before", dayBefore, "Akce Čtvrteční florbal začíná zítra v 18:00"],
      ["on the day", sameDay, "Akce Čtvrteční florbal začíná dnes v 18:00"],
      [
        "once it started",
        new Date(2030, 0, 3, 9, 0),
        "Akce Čtvrteční florbal začala včera v 18:00",
      ],
    ])("tells a participant %s", (_, now, expected) => {
      expect(notificationText(i18n.t, reminderOf("EVENT_REMINDER"), { now })).toBe(expected)
    })

    it("names the day further off", () => {
      expect(
        notificationText(i18n.t, reminderOf("EVENT_REMINDER"), { now: new Date(2029, 11, 30, 9) }),
      ).toBe("Akce Čtvrteční florbal začíná st 2. 1. v 18:00")
    })

    it("tells an organizer how full it is", () => {
      expect(
        notificationText(i18n.t, reminderOf("HOSTED_EVENT_REMINDER"), { now: dayBefore }),
      ).toBe("Tvoje akce Čtvrteční florbal začíná zítra v 18:00, obsazeno 7 z 12")
    })

    it.each([
      [1, "chybí 1 účastník"],
      [3, "chybí 3 účastníci"],
      [5, "chybí 5 účastníků"],
    ])("tells an organizer %i missing to the minimum", (missing, expected) => {
      const notification = reminderOf("HOSTED_EVENT_REMINDER", {
        occupancy: { ...occupancy, missingToMinimum: missing },
      })
      expect(notificationText(i18n.t, notification, { now: sameDay })).toBe(
        `Tvoje akce Čtvrteční florbal začíná dnes v 18:00, obsazeno 7 z 12, do minima ${expected}`,
      )
    })

    it("leaves the numbers out once it started", () => {
      expect(
        notificationText(i18n.t, reminderOf("HOSTED_EVENT_REMINDER"), {
          now: new Date(2030, 0, 2, 19, 0),
        }),
      ).toBe("Tvoje akce Čtvrteční florbal začala dnes v 18:00")
    })

    it("follows the language", async () => {
      await i18n.changeLanguage("en")
      expect(
        notificationText(i18n.t, reminderOf("EVENT_REMINDER"), { now: dayBefore, locale: "en" }),
      ).toMatch(/^Čtvrteční florbal starts tomorrow at 0?6:00\sPM$/)
      await i18n.changeLanguage("cs")
    })
  })

  it("follows the language", async () => {
    await i18n.changeLanguage("en")
    expect(notificationText(i18n.t, aNotification({ type: "EVENT_CANCELLED" }))).toBe(
      "The event Čtvrteční florbal was cancelled",
    )
    await i18n.changeLanguage("cs")
  })
})

// #236: the calls to rate an event, with until when.
describe("rating prompts", () => {
  const deadline = new Date(2030, 0, 9, 20, 0)
  const promptOf = (type: "RATING_PROMPT" | "HOSTED_RATING_PROMPT", kind: "FIRST" | "LAST_CALL") =>
    aNotification({ type, actor: null, ratingPrompt: { kind, deadline } })

  it.each([
    [
      "RATING_PROMPT",
      "FIRST",
      "Jak se ti líbila akce Čtvrteční florbal? Ohodnoť organizátora, můžeš do zítra v 20:00",
    ],
    [
      "RATING_PROMPT",
      "LAST_CALL",
      "Poslední den na ohodnocení organizátora akce Čtvrteční florbal, můžeš do zítra v 20:00",
    ],
    [
      "HOSTED_RATING_PROMPT",
      "FIRST",
      "Ohodnoť účastníky své akce Čtvrteční florbal, můžeš do zítra v 20:00",
    ],
    [
      "HOSTED_RATING_PROMPT",
      "LAST_CALL",
      "Poslední den na ohodnocení účastníků akce Čtvrteční florbal, můžeš do zítra v 20:00",
    ],
  ] as const)("%s %s", (type, kind, expected) => {
    expect(
      notificationText(i18n.t, promptOf(type, kind), { now: new Date(2030, 0, 8, 12, 0) }),
    ).toBe(expected)
  })

  it.each(["RATING_PROMPT", "HOSTED_RATING_PROMPT"] as const)(
    "%s leads to the ratings of the event",
    (type) => {
      expect(notificationTarget(promptOf(type, "FIRST"))).toEqual({
        kind: "eventRatings",
        eventId: "e1",
      })
    },
  )
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

  // #240: the reporter has no page of their reports; there is nowhere to go.
  it("leads a dealt-with report nowhere", () => {
    expect(
      notificationTarget(aNotification({ type: "REPORT_RESOLVED", actor: null, event: null })),
    ).toBeNull()
  })

  // #239: the event no longer exists for them, only for its organizers.
  it("sends a participant of a hidden event to their own events", () => {
    expect(notificationTarget(aNotification({ type: "EVENT_HIDDEN" }))).toEqual({
      kind: "myEvents",
    })
  })

  it("sends the organizer of a hidden event to the event, where the reason is", () => {
    expect(
      notificationTarget(aNotification({ type: "EVENT_HIDDEN", reason: "Nabízí placené služby." })),
    ).toEqual({ kind: "event", eventId: "e1" })
    expect(notificationTarget(aNotification({ type: "EVENT_RESTORED" }))).toEqual({
      kind: "event",
      eventId: "e1",
    })
  })

  it("sends the organizers to the participants before the start (#233)", () => {
    expect(notificationTarget(aNotification({ type: "HOSTED_EVENT_REMINDER" }))).toEqual({
      kind: "eventParticipants",
      eventId: "e1",
    })
    expect(notificationTarget(aNotification({ type: "EVENT_REMINDER" }))).toEqual({
      kind: "event",
      eventId: "e1",
    })
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

// #228: a friend request and its acceptance are about a person, not an event.
describe("friend requests", () => {
  const aboutFriendship = (type: "FRIEND_REQUEST" | "FRIEND_REQUEST_ACCEPTED"): Notification =>
    aNotification({
      type,
      event: null,
      friendRequest: { id: "fr1", status: "PENDING" },
    })

  it.each([
    ["FRIEND_REQUEST", "Honza_K vás žádá o přátelství"],
    ["FRIEND_REQUEST_ACCEPTED", "Honza_K přijal(a) vaši žádost o přátelství"],
  ] as const)("says %s in a sentence", (type, text) => {
    expect(notificationText(i18n.t, aboutFriendship(type))).toBe(text)
  })

  it.each(["FRIEND_REQUEST", "FRIEND_REQUEST_ACCEPTED"] as const)(
    "sends %s to the profile of the other person",
    (type) => {
      expect(notificationTarget(aboutFriendship(type))).toEqual({ kind: "profile", userId: "u2" })
    },
  )
})

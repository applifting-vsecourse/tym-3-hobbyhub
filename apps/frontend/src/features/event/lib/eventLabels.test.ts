import { describe, expect, it } from "vitest"

import { i18n } from "@/i18n"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { eventDay, eventMeta, eventTime, eventWhen } from "@/features/event/lib/eventLabels"

const t = i18n.t.bind(i18n)

const event = (overrides: Partial<EventListItem> = {}): EventListItem => ({
  id: "e1",
  title: "Čtvrteční florbal",
  imageUrl: null,
  startAt: new Date(2026, 9, 22, 19, 0),
  endAt: new Date(2026, 9, 22, 21, 0),
  venueType: "PUBLIC_VENUE",
  placeName: "ZŠ Kobylisy",
  district: "Praha 8",
  city: "Praha",
  level: "Pokročilí",
  latitude: 50.1297,
  longitude: 14.4421,
  distanceKm: null,
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 8,
  maxParticipants: 10,
  takenCount: 7,
  ...overrides,
})

describe("eventDay and eventTime", () => {
  const now = new Date(2026, 9, 22, 8, 0)

  it("says today and tomorrow in words", () => {
    expect(eventDay(t, new Date(2026, 9, 22, 19, 0), now, "cs")).toBe("Dnes")
    expect(eventDay(t, new Date(2026, 9, 23, 10, 0), now, "cs")).toBe("Zítra")
  })

  it("gives weekday and date further ahead", () => {
    expect(eventDay(t, new Date(2026, 9, 29, 18, 30), now, "cs")).toBe("čtvrtek 29. října")
  })

  it("formats the start time", () => {
    expect(eventTime(new Date(2026, 9, 29, 18, 30), "cs")).toBe("18:30")
  })
})

describe("eventWhen", () => {
  const now = new Date(2026, 9, 22, 8, 0)

  it("puts the time after today or tomorrow", () => {
    expect(eventWhen(t, new Date(2026, 9, 22, 19, 0), now, "cs")).toBe("Dnes 19:00")
    expect(eventWhen(t, new Date(2026, 9, 23, 10, 0), now, "cs")).toBe("Zítra 10:00")
  })

  it("uses the short day further ahead", () => {
    expect(eventWhen(t, new Date(2026, 9, 29, 18, 30), now, "cs")).toBe("čt 29. 10. 18:30")
  })
})

describe("eventMeta", () => {
  it("joins activity, venue, district and level", () => {
    expect(eventMeta(t, event(), "Florbal")).toBe("Florbal · ZŠ Kobylisy, Praha 8 · Pokročilí")
  })

  it("shows just the district for a private venue and falls back to the city", () => {
    expect(eventMeta(t, event({ placeName: null, level: null }), "Florbal")).toBe(
      "Florbal · Praha 8",
    )
    expect(eventMeta(t, event({ placeName: null, district: null, level: null }), "Florbal")).toBe(
      "Florbal · Praha",
    )
  })

  it("says online for an online event", () => {
    expect(
      eventMeta(
        t,
        event({ venueType: "ONLINE", placeName: null, district: null, city: null }),
        "Šachy",
      ),
    ).toBe("Šachy · Online · Pokročilí")
  })
})

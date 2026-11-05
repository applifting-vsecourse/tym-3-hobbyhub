import { describe, expect, it } from "vitest"

import type { EventLocation } from "@/features/event/api/eventSchemas"
import { mapsPlatform, navigationLink } from "@/features/event/lib/navigationLink"

const located: EventLocation = {
  street: "Chabařovická 4",
  city: "Praha 8",
  postalCode: "182 00",
  country: "Česko",
  placeName: "ZŠ Kobylisy",
  latitude: 50.1297,
  longitude: 14.4421,
}
const typedByHand: EventLocation = { ...located, latitude: null, longitude: null }

describe("mapsPlatform", () => {
  it.each([
    ["an iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5, "ios"],
    ["an iPad posing as a Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5, "ios"],
    ["a Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0, "other"],
    ["an Android phone", "Mozilla/5.0 (Linux; Android 15; Pixel 9)", 5, "android"],
    ["a Windows computer", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 0, "other"],
  ])("recognises %s", (_, userAgent, touchPoints, expected) => {
    expect(mapsPlatform(userAgent, touchPoints)).toBe(expected)
  })
})

describe("navigationLink", () => {
  it("lets an Android phone choose the app, going to the exact position", () => {
    expect(navigationLink(located, "android")).toEqual({
      href: "geo:0,0?q=50.1297,14.4421",
      isWebPage: false,
    })
  })

  it("opens Apple Maps on an iPhone", () => {
    expect(navigationLink(located, "ios")).toEqual({
      href: "https://maps.apple.com/?daddr=50.1297%2C14.4421",
      isWebPage: true,
    })
  })

  it("opens Google Maps on a computer", () => {
    expect(navigationLink(located, "other")).toEqual({
      href: "https://www.google.com/maps/dir/?api=1&destination=50.1297%2C14.4421",
      isWebPage: true,
    })
  })

  it("falls back to the written address when the event has no position", () => {
    expect(navigationLink(typedByHand, "other").href).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Chabařovická 4, 182 00 Praha 8, Česko")}`,
    )
  })
})

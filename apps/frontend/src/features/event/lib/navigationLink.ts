import type { EventLocation } from "@/features/event/api/eventSchemas"

export type MapsPlatform = "ios" | "android" | "other"

export type NavigationLink = {
  href: string
  /** A web page opens in a new tab; a `geo:` link hands over to the phone's own choice of app. */
  isWebPage: boolean
}

/**
 * iPadOS reports itself as a Mac, with a touch screen only a tablet has.
 * Anything else, a computer included, gets the web map.
 */
export function mapsPlatform(userAgent: string, maxTouchPoints: number): MapsPlatform {
  const isApple = ["iPhone", "iPad", "iPod"].some((device) => userAgent.includes(device))
  if (isApple || (userAgent.includes("Macintosh") && maxTouchPoints > 1)) return "ios"
  if (userAgent.includes("Android")) return "android"
  return "other"
}

const hasPosition = (location: EventLocation) =>
  location.latitude !== null && location.longitude !== null

/** The exact position when the address has one, otherwise the address as text. */
function destinationOf(location: EventLocation): string {
  if (hasPosition(location)) {
    return `${location.latitude},${location.longitude}`
  }
  return `${location.street}, ${location.postalCode} ${location.city}, ${location.country}`
}

/**
 * Where "Navigovat" leads. Android's `geo:` link makes the phone offer every
 * map app it has; iOS cannot offer a choice from a web page, so it opens Apple
 * Maps; a computer opens Google Maps.
 */
export function navigationLink(location: EventLocation, platform: MapsPlatform): NavigationLink {
  const destination = encodeURIComponent(destinationOf(location))
  if (platform === "android") {
    // Coordinates stay readable as such; only a written address is encoded.
    const query = hasPosition(location) ? destinationOf(location) : destination
    return { href: `geo:0,0?q=${query}`, isWebPage: false }
  }
  if (platform === "ios") {
    return { href: `https://maps.apple.com/?daddr=${destination}`, isWebPage: true }
  }
  return {
    href: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    isWebPage: true,
  }
}

// #215: the city a visitor picked for "Ve tvém okolí", kept in this browser
// only. Storage can be missing or refuse (a private window); then nothing is
// remembered and the server picks the city with the most events.
const KEY = "hobbyhub.landing.city"
const MAX_LENGTH = 100

export function readLandingCity(): string | null {
  try {
    const value = window.localStorage.getItem(KEY)?.trim()
    return value ? value.slice(0, MAX_LENGTH) : null
  } catch {
    return null
  }
}

export function saveLandingCity(city: string) {
  try {
    window.localStorage.setItem(KEY, city)
  } catch {
    // Not remembered; the pick still holds until the page is left.
  }
}

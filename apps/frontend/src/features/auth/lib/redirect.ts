import type { ParsedLocation } from "@tanstack/react-router"

export const encodeRedirectUri = (location: ParsedLocation) => encodeURIComponent(location.href)

export const decodeRedirectUri = (encoded: string) => {
  try {
    return decodeURIComponent(encoded)
  } catch {
    return "/"
  }
}

/**
 * Where to go after signing in or up: the page the user came from, or
 * `fallback`. Only paths inside the app — `from` comes from the URL, so it
 * must not be able to send people to another site.
 */
export const redirectTarget = (from: string | undefined, fallback: string) => {
  if (!from) return fallback
  const path = decodeRedirectUri(from)
  // A backslash is read as a slash by browsers: "/\\evil.example" is "//evil.example".
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : fallback
}

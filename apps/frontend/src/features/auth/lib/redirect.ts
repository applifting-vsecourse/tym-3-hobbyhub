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
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback
}

/**
 * Like `redirectTarget`, but never a page under `excluded`. A sign-in that was
 * sent from `excluded?from=/events/42` carries that whole URL as its own
 * `from`, so the page it wraps is followed instead: the way back to the event
 * survives, and the excluded page itself is never the way out of itself.
 */
export const redirectTargetOutside = (
  from: string | undefined,
  fallback: string,
  excluded: string,
  maxDepth = 3,
): string => {
  const target = redirectTarget(from, fallback)
  if (
    target !== excluded &&
    !target.startsWith(`${excluded}?`) &&
    !target.startsWith(`${excluded}/`)
  ) {
    return target
  }
  if (maxDepth <= 0) return fallback
  const nested = new URL(target, "http://app.invalid").searchParams.get("from") ?? undefined
  return redirectTargetOutside(
    nested ? encodeURIComponent(nested) : undefined,
    fallback,
    excluded,
    maxDepth - 1,
  )
}

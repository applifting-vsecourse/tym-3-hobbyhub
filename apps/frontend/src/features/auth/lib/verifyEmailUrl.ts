import { ROUTES } from "@/app/routes"

/** How long the person waits between two "send again" clicks; the server enforces the same. */
export const RESEND_COOLDOWN_SECONDS = 60

/**
 * Where the link in the verification e-mail ends (F-03.2): the page that
 * confirms it and sends the person on to `next`, the page they came from.
 * A page of the app that works signed out, because the link is often opened
 * where the user is not signed in.
 */
export const verifyEmailCallbackUrl = (next?: string) => {
  const query = next ? `?next=${encodeURIComponent(next)}` : ""
  return `${window.location.origin}${ROUTES.verifyEmail}${query}`
}

/** The page the person is on, as a path the confirmation can lead back to. */
export const currentPath = () => `${window.location.pathname}${window.location.search}`

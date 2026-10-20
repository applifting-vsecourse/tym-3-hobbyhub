import { ROUTES } from "@/app/routes"

/** The places the main navigation can highlight. */
export type NavSection = "discover" | "my-events" | "add" | "groups" | "profile"

/** The sections with a link of their own; "add" is the raised button. */
export type NavPlace = Exclude<NavSection, "add">

/**
 * Where a navigation item leads. `href` is for a page the router does not know
 * yet (the event list from F-02.3 #7); it becomes `to` once that route exists.
 */
export type NavTarget =
  { to: typeof ROUTES.myEvents | typeof ROUTES.groups | typeof ROUTES.profile } | { href: string }

export const NAV_TARGETS: Record<NavPlace, NavTarget> = {
  discover: { href: ROUTES.events },
  "my-events": { to: ROUTES.myEvents },
  groups: { to: ROUTES.groups },
  profile: { to: ROUTES.profile },
}

const isUnder = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`)

/**
 * Which section the current page belongs to, by an explicit map rather than a
 * prefix: the new-event form lives under /events but is not "discovering" —
 * it is "Přidat". The landing page highlights nothing.
 */
export function navSectionForPath(pathname: string): NavSection | null {
  if (isUnder(pathname, ROUTES.newEvent)) return "add"
  if (isUnder(pathname, ROUTES.events)) return "discover"
  if (isUnder(pathname, ROUTES.groups)) return "groups"
  if (isUnder(pathname, ROUTES.myEvents)) return "my-events"
  if (isUnder(pathname, ROUTES.profile)) return "profile"
  return null
}

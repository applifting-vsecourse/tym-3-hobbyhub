import type { ComponentType, SVGProps } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import DiscoverIcon from "@/assets/ui-icons/nav-discover.svg?react"
import GroupsIcon from "@/assets/ui-icons/nav-groups.svg?react"
import MyEventsIcon from "@/assets/ui-icons/nav-my-events.svg?react"
import ProfileIcon from "@/assets/ui-icons/nav-profile.svg?react"
import { Logo } from "@/components/hobbyhub/Logo"
import { NavLink } from "@/components/NavLink"
import { NAV_TARGETS, navPlacesFor, type NavPlace, type NavSection } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const ICONS: Record<NavPlace, ComponentType<SVGProps<SVGSVGElement>>> = {
  discover: DiscoverIcon,
  "my-events": MyEventsIcon,
  groups: GroupsIcon,
  profile: ProfileIcon,
}

const NAV_LABELS = {
  discover: "hobbyhub.nav.discover",
  "my-events": "hobbyhub.nav.myEvents",
  groups: "hobbyhub.nav.groups",
  profile: "hobbyhub.nav.profile",
} as const

type BottomNavProps = {
  /** The highlighted section; `null` on pages that belong to none (the landing page). */
  readonly active: NavSection | null
  /** A visitor gets Objevovat, Přidat and Skupiny only (#151). */
  readonly isSignedIn: boolean
  readonly hasNewRequests?: boolean
  readonly className?: string
}

type NavItemProps = {
  readonly place: NavPlace
  readonly isActive: boolean
  readonly hasDot: boolean
}

function NavItem({ place, isActive, hasDot }: NavItemProps) {
  const { t } = useTranslation()
  const Icon = ICONS[place]
  const label = t(NAV_LABELS[place])

  return (
    <NavLink
      to={NAV_TARGETS[place]}
      isActive={isActive}
      aria-label={hasDot ? t("hobbyhub.nav.withNewRequests", { label }) : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 typo-caption outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="relative">
        <Icon
          aria-hidden
          className="size-6"
        />
        {hasDot ? (
          <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary" />
        ) : null}
      </span>
      {label}
    </NavLink>
  )
}

/**
 * Spodní navigace (vzhled Soupiska) — the sections of the viewer around a
 * raised logo button "Přidat" in the middle that starts a new event: four for
 * a signed-in user, two for a visitor. Přihlášky and Pořádám are merged into
 * Moje akce. Positioning (sticky to the bottom) is the shell's job.
 */
export function BottomNav({
  active,
  isSignedIn,
  hasNewRequests = false,
  className,
}: BottomNavProps) {
  const { t } = useTranslation()
  const places = navPlacesFor(isSignedIn)
  // "Přidat" splits the places evenly: two and two, or one and one.
  const middle = Math.ceil(places.length / 2)
  const renderItem = (place: NavPlace) => (
    <NavItem
      key={place}
      place={place}
      isActive={active === place}
      hasDot={hasNewRequests && place === "my-events"}
    />
  )

  return (
    // The top padding only makes room for the raised button; clicks there
    // must still reach the page underneath, so only the bar takes them.
    <nav
      aria-label={t("hobbyhub.nav.label")}
      className={cn("pointer-events-none w-full pt-9", className)}
    >
      <div className="pointer-events-auto flex items-start border-t border-border bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {places.slice(0, middle).map(renderItem)}
        <Link
          to={ROUTES.newEvent}
          aria-current={active === "add" ? "page" : undefined}
          // The label follows the same rule as the others; the raised button
          // itself is always primary.
          className={cn(
            "group relative flex flex-1 flex-col items-center gap-0.5 py-2 typo-caption outline-none",
            active === "add" ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            aria-hidden
            className="absolute -top-8.75 flex size-16 items-center justify-center rounded-[22px] border-5 border-background bg-primary group-focus-visible:ring-[3px] group-focus-visible:ring-ring"
          >
            <Logo
              variant="mark"
              className="size-12"
            />
          </span>
          <span className="size-6" />
          {t("hobbyhub.nav.add")}
        </Link>
        {places.slice(middle).map(renderItem)}
      </div>
    </nav>
  )
}

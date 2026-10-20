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
import { NAV_TARGETS, type NavPlace, type NavSection } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const SECTIONS: {
  key: NavPlace
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { key: "discover", Icon: DiscoverIcon },
  { key: "my-events", Icon: MyEventsIcon },
  { key: "groups", Icon: GroupsIcon },
  { key: "profile", Icon: ProfileIcon },
]

const NAV_LABELS = {
  discover: "hobbyhub.nav.discover",
  "my-events": "hobbyhub.nav.myEvents",
  groups: "hobbyhub.nav.groups",
  profile: "hobbyhub.nav.profile",
} as const

type BottomNavProps = {
  /** The highlighted section; `null` on pages that belong to none (the landing page). */
  readonly active: NavSection | null
  readonly hasNewRequests?: boolean
  readonly className?: string
}

type NavItemProps = {
  readonly section: (typeof SECTIONS)[number]
  readonly isActive: boolean
  readonly hasDot: boolean
}

function NavItem({ section, isActive, hasDot }: NavItemProps) {
  const { t } = useTranslation()
  const { key, Icon } = section
  const label = t(NAV_LABELS[key])

  return (
    <NavLink
      target={NAV_TARGETS[key]}
      isActive={isActive}
      aria-label={hasDot ? t("hobbyhub.nav.withNewRequests", { label }) : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-0.5 rounded-md py-2 typo-caption outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
 * Spodní navigace (vzhled Soupiska) — four sections and a raised logo button
 * "Přidat" in the middle that starts a new event. Přihlášky and Pořádám are
 * merged into Moje akce. Positioning (sticky to the bottom) is the shell's job.
 */
export function BottomNav({ active, hasNewRequests = false, className }: BottomNavProps) {
  const { t } = useTranslation()
  const renderItem = (section: (typeof SECTIONS)[number]) => (
    <NavItem
      key={section.key}
      section={section}
      isActive={active === section.key}
      hasDot={hasNewRequests && section.key === "my-events"}
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
        {SECTIONS.slice(0, 2).map(renderItem)}
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
            className="absolute -top-8.75 flex size-16 items-center justify-center rounded-[22px] border-5 border-background bg-primary group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50"
          >
            <Logo
              variant="mark"
              className="size-12"
            />
          </span>
          <span className="size-6" />
          {t("hobbyhub.nav.add")}
        </Link>
        {SECTIONS.slice(2).map(renderItem)}
      </div>
    </nav>
  )
}

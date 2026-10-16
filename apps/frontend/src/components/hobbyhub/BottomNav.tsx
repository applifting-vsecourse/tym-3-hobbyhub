import type { ComponentType, SVGProps } from "react"

import DiscoverIcon from "@/assets/ui-icons/nav-discover.svg?react"
import GroupsIcon from "@/assets/ui-icons/nav-groups.svg?react"
import MyEventsIcon from "@/assets/ui-icons/nav-my-events.svg?react"
import ProfileIcon from "@/assets/ui-icons/nav-profile.svg?react"
import { Logo } from "@/components/hobbyhub/Logo"
import { cn } from "@/lib/utils"

export type BottomNavSection = "discover" | "my-events" | "groups" | "profile"

const SECTIONS: {
  key: BottomNavSection
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { key: "discover", label: "Objevovat", Icon: DiscoverIcon },
  { key: "my-events", label: "Moje akce", Icon: MyEventsIcon },
  { key: "groups", label: "Skupiny", Icon: GroupsIcon },
  { key: "profile", label: "Profil", Icon: ProfileIcon },
]

type BottomNavProps = {
  active: BottomNavSection
  onNavigate: (section: BottomNavSection) => void
  onAdd: () => void
  /** Shows the dot on "Moje akce" when requests wait for approval. */
  hasNewRequests?: boolean
  className?: string
}

function NavItem({
  section,
  isActive,
  hasDot,
  onNavigate,
}: {
  section: (typeof SECTIONS)[number]
  isActive: boolean
  hasDot: boolean
  onNavigate: BottomNavProps["onNavigate"]
}) {
  const { key, label, Icon } = section

  return (
    <button
      type="button"
      aria-current={isActive ? "page" : undefined}
      onClick={() => onNavigate(key)}
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
          <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary">
            <span className="sr-only">, nové žádosti</span>
          </span>
        ) : null}
      </span>
      {label}
    </button>
  )
}

/**
 * Spodní navigace (vzhled Soupiska) — four sections and a raised logo button
 * "Přidat" in the middle. Přihlášky and Pořádám are merged into Moje akce.
 */
export function BottomNav({
  active,
  onNavigate,
  onAdd,
  hasNewRequests = false,
  className,
}: BottomNavProps) {
  const renderItem = (section: (typeof SECTIONS)[number]) => (
    <NavItem
      key={section.key}
      section={section}
      isActive={active === section.key}
      hasDot={hasNewRequests && section.key === "my-events"}
      onNavigate={onNavigate}
    />
  )

  return (
    <nav
      aria-label="Hlavní navigace"
      className={cn("w-full pt-9", className)}
    >
      <div className="flex items-start border-t border-border bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {SECTIONS.slice(0, 2).map(renderItem)}
        <button
          type="button"
          onClick={onAdd}
          className="group relative flex flex-1 flex-col items-center gap-0.5 py-2 typo-caption text-primary outline-none"
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
          Přidat
        </button>
        {SECTIONS.slice(2).map(renderItem)}
      </div>
    </nav>
  )
}

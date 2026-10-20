import { useTranslation } from "react-i18next"

import { HeaderNavLink } from "@/components/Header/HeaderNavLink"
import { NAV_TARGETS, type NavSection } from "@/lib/navigation"

type HeaderNavProps = {
  active: NavSection | null
}

const ITEMS: { section: NavSection; labelKey: string }[] = [
  { section: "discover", labelKey: "hobbyhub.nav.discover" },
  { section: "my-events", labelKey: "hobbyhub.nav.myEvents" },
  { section: "groups", labelKey: "hobbyhub.nav.groups" },
]

// Desktop only: on phones the same places are in the BottomNav. Profile is not
// here either — the avatar menu has it. The logo already links home.
export function HeaderNav({ active }: HeaderNavProps) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("hobbyhub.nav.label")}
      className="hidden min-w-0 items-center gap-1 md:flex"
    >
      {ITEMS.map(({ section, labelKey }) => (
        <HeaderNavLink
          key={section}
          target={NAV_TARGETS[section]}
          isActive={active === section}
        >
          {t(labelKey)}
        </HeaderNavLink>
      ))}
    </nav>
  )
}

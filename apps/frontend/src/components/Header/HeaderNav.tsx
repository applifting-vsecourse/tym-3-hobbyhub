import { useTranslation } from "react-i18next"

import { HeaderNavLink } from "@/components/Header/HeaderNavLink"
import { NAV_TARGETS, navPlacesFor, type NavPlace, type NavSection } from "@/lib/navigation"

type HeaderNavProps = {
  active: NavSection | null
  /** A visitor gets the public places only (#151). */
  isSignedIn: boolean
}

const LABELS: Record<NavPlace, string> = {
  discover: "hobbyhub.nav.discover",
  "my-events": "hobbyhub.nav.myEvents",
  groups: "hobbyhub.nav.groups",
  profile: "hobbyhub.nav.profile",
}

// Desktop only: on phones the same places are in the BottomNav. Profile is not
// here either — the avatar menu has it. The logo already links home.
export function HeaderNav({ active, isSignedIn }: HeaderNavProps) {
  const { t } = useTranslation()
  const places = navPlacesFor(isSignedIn).filter((place) => place !== "profile")

  return (
    <nav
      aria-label={t("hobbyhub.nav.label")}
      className="hidden items-center gap-1 md:mr-2 md:flex"
    >
      {places.map((place) => (
        <HeaderNavLink
          key={place}
          to={NAV_TARGETS[place]}
          isActive={active === place}
        >
          {t(LABELS[place])}
        </HeaderNavLink>
      ))}
    </nav>
  )
}

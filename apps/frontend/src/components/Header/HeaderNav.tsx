import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { HeaderNavLink } from "@/components/Header/HeaderNavLink"

// The logo already links home, so "Home" would be a duplicate.
export function HeaderNav() {
  const { t } = useTranslation()

  return (
    <nav className="flex min-w-0 [scrollbar-width:none] items-center gap-1 overflow-x-auto">
      <HeaderNavLink to={ROUTES.quacks}>{t("header.nav.quacks")}</HeaderNavLink>
      <HeaderNavLink to={ROUTES.designSystem}>{t("header.nav.designSystem")}</HeaderNavLink>
    </nav>
  )
}

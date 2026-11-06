import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/hobbyhub/Logo"

const LINKS = [
  { to: ROUTES.events, labelKey: "hobbyhub.nav.discover" },
  { to: ROUTES.groups, labelKey: "hobbyhub.nav.groups" },
  { to: ROUTES.terms, labelKey: "terms.title" },
] as const

/**
 * Patička — the wordmark, one line on what the app is for, the public places
 * and the copyright. Tall enough that the last block of a page can scroll up
 * to the middle of the screen.
 */
export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between md:px-6 md:py-16 lg:px-8">
        <div className="flex max-w-md flex-col gap-3">
          <Link
            to={ROUTES.home}
            className="w-fit rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Logo
              variant="wordmark"
              className="h-7"
            />
          </Link>
          <p className="typo-body text-muted-foreground">{t("footer.tagline")}</p>
          <p className="typo-small text-muted-foreground">{t("footer.copyright", { year })}</p>
        </div>
        <nav
          aria-label={t("footer.label")}
          className="flex flex-col gap-2 md:items-end"
        >
          {LINKS.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              className="w-fit rounded-md py-1 typo-label text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

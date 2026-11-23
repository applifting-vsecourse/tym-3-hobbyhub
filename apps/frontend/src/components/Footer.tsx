import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/hobbyhub/Logo"
import { ThemeChoice } from "@/components/ThemeChoice"

// The footer's columns of links (#215); each heads its own list.
const COLUMNS = [
  {
    titleKey: "footer.discover",
    links: [
      { to: ROUTES.events, labelKey: "hobbyhub.nav.discover" },
      { to: ROUTES.groups, labelKey: "hobbyhub.nav.groups" },
      { to: ROUTES.newEvent, labelKey: "hobbyhub.nav.add" },
    ],
  },
  {
    titleKey: "footer.about",
    links: [{ to: ROUTES.terms, labelKey: "terms.title" }],
  },
] as const

const linkClass =
  "inline-flex min-h-11 w-fit items-center rounded-md typo-body text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring md:min-h-0 md:py-1"

/**
 * Patička (#215) — the wordmark and one line on what the app is for, the
 * public places in columns, and Nastavení: the language and the appearance,
 * for everyone (the header has no switchers). A bar with the copyright closes
 * the page.
 *
 * `language` is the language switch (#262), a slot because whether a choice
 * is saved to the account depends on the session, which `components/` does not
 * know.
 */
export function Footer({ language }: { language?: ReactNode }) {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-page py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr] lg:gap-12">
          <div className="flex max-w-sm flex-col gap-3">
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
          </div>
          {/* One navigation landmark for the page's end, its columns inside. */}
          <nav
            aria-label={t("footer.label")}
            className="grid grid-cols-2 gap-8 lg:col-span-2"
          >
            {COLUMNS.map(({ titleKey, links }) => (
              <div
                key={titleKey}
                className="flex flex-col gap-2"
              >
                <h2 className="typo-label-lg text-foreground">{t(titleKey)}</h2>
                <ul className="flex flex-col md:gap-1">
                  {links.map(({ to, labelKey }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        className={linkClass}
                      >
                        {t(labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="flex flex-col items-start gap-3">
            <h2 className="typo-label-lg text-foreground">{t("footer.settings")}</h2>
            {/* The toggles carry their own names; the captions are for the eye. */}
            {language ? (
              <div className="flex flex-col items-start gap-1.5">
                <p
                  aria-hidden
                  className="typo-small text-muted-foreground"
                >
                  {t("footer.language")}
                </p>
                {language}
              </div>
            ) : null}
            <div className="flex flex-col items-start gap-1.5">
              <p
                aria-hidden
                className="typo-small text-muted-foreground"
              >
                {t("settings.theme.label")}
              </p>
              <ThemeChoice />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-5 typo-small text-muted-foreground md:flex-row md:justify-between">
          <p>{t("footer.copyright", { year })}</p>
          <p>{t("footer.madeIn")}</p>
        </div>
      </div>
    </footer>
  )
}

import type { ReactNode } from "react"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { LanguageSwitcher } from "@/components/Header/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"

type HeaderProps = {
  // Auth-aware menu (sign-in CTA / user dropdown). Passed as a slot so
  // `components/` doesn't have to import from `features/auth`.
  userMenu: ReactNode
  // Main navigation (desktop) and the actions next to the switchers ("Přidat").
  // Slots for the same reason: whether they show depends on the session.
  nav?: ReactNode
  actions?: ReactNode
  // Discovery header: a location search between the logo and the navigation
  // (wide screens only).
  search?: ReactNode
}

/**
 * The same width and height on every page, with the navigation anchored to
 * the right-hand group: the search field comes and goes between pages and
 * must not move anything else.
 */
export function Header({ userMenu, nav, actions, search }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4 md:h-16 md:px-6 lg:px-8">
        <HeaderLogo />
        {search ? <div className="hidden max-w-xl min-w-0 flex-1 lg:block">{search}</div> : null}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {nav}
          {actions}
          <LanguageSwitcher />
          <ThemeSwitcher />
          {userMenu}
        </div>
      </div>
    </header>
  )
}

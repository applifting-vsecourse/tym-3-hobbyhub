import type { ReactNode } from "react"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { LanguageSwitcher } from "@/components/Header/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { cn } from "@/lib/utils"

type HeaderProps = {
  // Auth-aware menu (sign-in CTA / user dropdown). Passed as a slot so
  // `components/` doesn't have to import from `features/auth`.
  userMenu: ReactNode
  // Main navigation (desktop) and the actions next to the switchers ("Přidat").
  // Slots for the same reason: whether they show depends on the session.
  nav?: ReactNode
  actions?: ReactNode
  // Discovery header: a location search next to the nav (wide screens only) and
  // the bar spans the full page width like the content under it.
  search?: ReactNode
}

export function Header({ userMenu, nav, actions, search }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div
        className={cn(
          "mx-auto flex h-14 w-full items-center gap-2 px-4 sm:gap-4",
          search && "md:px-6 lg:px-8",
          search ? "max-w-6xl md:h-16" : "max-w-4xl",
        )}
      >
        <HeaderLogo />
        {search ? <div className="hidden max-w-xl flex-1 lg:block">{search}</div> : null}
        {nav}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
          <LanguageSwitcher />
          <ThemeSwitcher />
          {userMenu}
        </div>
      </div>
    </header>
  )
}

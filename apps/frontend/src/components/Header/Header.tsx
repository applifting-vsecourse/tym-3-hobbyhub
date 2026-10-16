import type { ReactNode } from "react"

import { HeaderLogo } from "@/components/Header/HeaderLogo"
import { HeaderNav } from "@/components/Header/HeaderNav"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"
import { cn } from "@/lib/utils"

type HeaderProps = {
  // Auth-aware menu (sign-in CTA / user dropdown). Passed as a slot so
  // `components/` doesn't have to import from `features/auth`.
  userMenu: ReactNode
  // Discovery header: a location search replaces the nav (desktop only) and
  // the bar spans the full page width like the content under it.
  search?: ReactNode
}

export function Header({ userMenu, search }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div
        className={cn(
          "mx-auto flex h-14 w-full items-center gap-4 px-4",
          search && "md:px-6 lg:px-8",
          search ? "max-w-6xl md:h-16" : "max-w-4xl",
        )}
      >
        <HeaderLogo />
        {search ? <div className="hidden max-w-xl flex-1 md:block">{search}</div> : <HeaderNav />}
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitcher />
          {userMenu}
        </div>
      </div>
    </header>
  )
}

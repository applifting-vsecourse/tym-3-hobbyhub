import type { ReactNode } from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { HeaderNav } from "@/components/Header/HeaderNav"
import { BottomNav } from "@/components/hobbyhub/BottomNav"
import { Button } from "@/components/ui/button"
import { navSectionForPath } from "@/lib/navigation"
import { cn } from "@/lib/utils"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"
import { useSession } from "@/features/auth/hooks/useSession"

type AppShellProps = {
  children: ReactNode
  /** Classes of the `<main>` element — the page's column, when it has one. */
  className?: string
  /** Location search in the header on discovery pages (landing only for now). */
  search?: ReactNode
}

/**
 * The app chrome every page keeps: the header, and for a signed-in user the
 * navigation — links and "Přidat" in the header from `md`, the BottomNav
 * below it. A visitor gets the header with "Sign in" only.
 */
export function AppShell({ children, className, search }: AppShellProps) {
  const { t } = useTranslation()
  const { user } = useSession()
  const pathname = useLocation({ select: (location) => location.pathname })
  const active = navSectionForPath(pathname)
  const isSignedIn = user !== null

  return (
    <div className="flex min-h-svh flex-col">
      <Header
        search={search}
        nav={isSignedIn ? <HeaderNav active={active} /> : null}
        actions={
          isSignedIn ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="max-md:hidden"
            >
              <Link to={ROUTES.newEvent}>{t("hobbyhub.nav.add")}</Link>
            </Button>
          ) : null
        }
        userMenu={<HeaderMenu />}
      />
      <main className={cn("flex-1", className)}>{children}</main>
      {isSignedIn ? (
        <BottomNav
          active={active}
          className="sticky bottom-0 z-40 md:hidden"
        />
      ) : null}
    </div>
  )
}

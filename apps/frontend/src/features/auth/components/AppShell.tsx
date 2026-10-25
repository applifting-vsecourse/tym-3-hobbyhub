import { useLayoutEffect, useRef, type ReactNode } from "react"
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
  /** Classes of the outermost element, for a page that must be exactly one screen tall. */
  shellClassName?: string
  /** Location search in the header on discovery pages (landing only for now). */
  search?: ReactNode
}

/**
 * The app chrome every page keeps: the header, and for a signed-in user the
 * navigation — links and "Přidat" in the header from `md`, the BottomNav
 * below it. A visitor gets the header with "Sign in" only.
 */
export function AppShell({ children, className, shellClassName, search }: AppShellProps) {
  const { t } = useTranslation()
  const { user } = useSession()
  const pathname = useLocation({ select: (location) => location.pathname })
  const active = navSectionForPath(pathname)
  const isSignedIn = user !== null
  const shellRef = useRef<HTMLDivElement>(null)
  const bottomNavRef = useRef<HTMLDivElement>(null)

  // Action bars fixed to the bottom of a phone screen (form submits) sit above
  // the BottomNav through `pb-above-bottom-nav`, which reads its height here.
  // From `md` the nav is hidden, its height drops to 0 and the bars sit low.
  useLayoutEffect(() => {
    const shell = shellRef.current
    const bottomNav = bottomNavRef.current
    if (!shell || !bottomNav) return
    const publishHeight = () => {
      shell.style.setProperty("--bottom-nav-height", `${bottomNav.offsetHeight}px`)
    }
    publishHeight()
    const observer = new ResizeObserver(publishHeight)
    observer.observe(bottomNav)
    return () => {
      observer.disconnect()
      shell.style.removeProperty("--bottom-nav-height")
    }
  }, [isSignedIn])

  return (
    <div
      ref={shellRef}
      className={cn("flex min-h-svh flex-col", shellClassName)}
    >
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
        // The nav's raised-button padding lets clicks through to the page;
        // the wrapper that is measured must not catch them either.
        <div
          ref={bottomNavRef}
          className="pointer-events-none sticky bottom-0 z-40 md:hidden"
        >
          <BottomNav active={active} />
        </div>
      ) : null}
    </div>
  )
}

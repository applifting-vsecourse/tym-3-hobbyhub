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
import { NotificationBell } from "@/features/notification/components/NotificationBell"

type AppShellProps = {
  children: ReactNode
  /** Classes of the `<main>` element — the page's column, when it has one. */
  className?: string
  /** Classes of the outermost element, for a page that must be exactly one screen tall. */
  shellClassName?: string
  /** Location search in the header on discovery pages (landing only for now). */
  search?: ReactNode
  /** The page's footer, under `<main>` and above the BottomNav (the landing page). */
  footer?: ReactNode
}

/**
 * The app chrome every page keeps: the header and the navigation — links and
 * "Přidat" in the header from `md`, the BottomNav below it. A signed-in user
 * also gets the notification bell and, in the navigation, Moje akce and
 * Profil; a visitor has Objevovat, Přidat and Skupiny with "Sign in" in the
 * header (#151). It lives in `app/`, not in a feature: it composes the auth
 * menu and the notifications, and a feature may not import another one.
 */
export function AppShell({ children, className, shellClassName, search, footer }: AppShellProps) {
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
  // The nav is there for everyone; only its items change with the session.
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
  }, [])

  return (
    <div
      ref={shellRef}
      className={cn("flex min-h-svh flex-col", shellClassName)}
    >
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 typo-label text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        {t("hobbyhub.nav.skipToContent")}
      </a>
      <Header
        search={search}
        nav={
          <HeaderNav
            active={active}
            isSignedIn={isSignedIn}
          />
        }
        actions={
          // A visitor is sent to sign in and comes back to the form.
          <Button
            asChild
            size="sm"
            variant="outline"
            className="max-md:hidden"
          >
            <Link to={ROUTES.newEvent}>{t("hobbyhub.nav.add")}</Link>
          </Button>
        }
        notifications={isSignedIn ? <NotificationBell /> : null}
        userMenu={<HeaderMenu />}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn("flex-1 outline-none", className)}
      >
        {children}
      </main>
      {footer}
      {/* The nav's raised-button padding lets clicks through to the page;
          the wrapper that is measured must not catch them either. */}
      <div
        ref={bottomNavRef}
        className="pointer-events-none sticky bottom-0 z-40 md:hidden"
      >
        <BottomNav
          active={active}
          isSignedIn={isSignedIn}
        />
      </div>
    </div>
  )
}

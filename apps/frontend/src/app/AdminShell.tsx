import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Button } from "@/components/ui/button"

import { useAdminSession } from "@/features/admin/hooks/useAdminSession"
import { useAdminSignOut } from "@/features/admin/hooks/useAdminSignOut"

const SECTIONS = [
  { to: ROUTES.adminUsers, label: "admin.nav.users" },
  { to: ROUTES.adminEvents, label: "admin.nav.events" },
  { to: ROUTES.adminGroups, label: "admin.nav.groups" },
  { to: ROUTES.adminAdministrators, label: "admin.nav.administrators" },
] as const

/**
 * ADR-0010, #238: the administration's chrome instead of `AppShell` (the
 * exception CLAUDE.md names). The app's header with the administrator's
 * sign-out, and the administration's own navigation under it at every width,
 * so phones need no BottomNav. Lives in `app/` like `AppShell`.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { administrator } = useAdminSession()
  const signOut = useAdminSignOut()

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 typo-label text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        {t("hobbyhub.nav.skipToContent")}
      </a>
      <Header
        userMenu={
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-9"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
          >
            {t("admin.signOut.label")}
          </Button>
        }
      />
      <div className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 md:px-6 lg:px-8">
          <p className="typo-label text-foreground">
            {t("admin.title")}
            {administrator ? (
              <span className="text-muted-foreground"> · {administrator.name}</span>
            ) : null}
          </p>
          <nav
            aria-label={t("admin.nav.label")}
            className="flex flex-wrap gap-1 md:ml-auto"
          >
            {SECTIONS.map((section) => (
              <Link
                key={section.to}
                to={section.to}
                className="flex min-h-11 items-center rounded-md px-2 typo-label whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring md:min-h-9"
                activeProps={{ className: "font-medium text-foreground", "aria-current": "page" }}
              >
                {t(section.label)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 outline-none md:px-6 md:py-10 lg:px-8"
      >
        {children}
      </main>
    </div>
  )
}

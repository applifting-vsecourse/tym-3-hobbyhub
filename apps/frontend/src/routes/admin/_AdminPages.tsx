import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AdminShell } from "@/app/AdminShell"
import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"

import { adminKeys } from "@/features/admin/api/adminKeys"
import { adminSessionQueryOptions } from "@/features/admin/api/adminSessionQueryOptions"

// ADR-0010, #238: everything under /admin but the sign-in needs an
// administrator's session; a user's one does not count.
export const Route = createFileRoute("/admin/_AdminPages")({
  loader: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(adminSessionQueryOptions())
    if (session) return
    // Whatever the administration cached belongs to a session that is over.
    context.queryClient.removeQueries({
      queryKey: adminKeys.all(),
      predicate: (query) => query.queryKey[1] !== "session",
    })
    throw redirect({ to: ROUTES.adminLogin })
  },
  component: Layout,
})

function Layout() {
  const { t } = useTranslation()
  return (
    <>
      <Seo title={t("admin.title")} />
      <AdminShell>
        <Outlet />
      </AdminShell>
    </>
  )
}

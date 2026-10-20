import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { AppShell } from "@/features/auth/components/AppShell"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"

export const Route = createFileRoute("/_ProtectedPages")({
  loader: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(authSessionQueryOptions())
    if (session) return
    context.queryClient.clear()
    throw redirect({
      to: ROUTES.login,
      search: { from: encodeRedirectUri(location) },
    })
  },
  component: Layout,
})

function Layout() {
  return (
    <>
      <Seo />
      <AppShell>
        <Outlet />
      </AppShell>
    </>
  )
}

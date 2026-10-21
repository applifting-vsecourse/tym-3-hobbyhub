import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"

import "@/styles/global.css"

import { NotFound } from "@/components/Error/NotFound"
import { Toaster } from "@/components/ui/sonner"

import { AppShell } from "@/features/auth/components/AppShell"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  // An unknown URL keeps the header and navigation. Deeper not-founds render
  // inside a layout that already has the shell (router's defaultNotFoundComponent).
  notFoundComponent: RootNotFound,
})

function RootNotFound() {
  return (
    <AppShell>
      <NotFound />
    </AppShell>
  )
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster
        richColors
        position="top-right"
      />
    </>
  )
}

import type { ReactNode } from "react"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"

/** A second, empty page every test router has, to navigate away to. */
export const AWAY_PATH = "/away"

function RootLayout() {
  return <Outlet />
}

function AwayPage() {
  return null
}

/**
 * Renders `ui` as the index page of a small in-memory router. Needed by
 * anything that uses router hooks, e.g. every `AppForm` (its guard blocks
 * navigation). Resolved once the first page is loaded, so queries right after
 * are synchronous.
 */
export async function renderWithRouter(ui: ReactNode) {
  function IndexPage() {
    return ui
  }
  const rootRoute = createRootRoute({ component: RootLayout })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: IndexPage,
  })
  const awayRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: AWAY_PATH,
    component: AwayPage,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, awayRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  await router.load()
  const result = render(<RouterProvider router={router} />)
  // Through the history, so the app's route types do not apply and a blocker
  // (the unsaved-changes guard) still sees it. Not awaited: a blocked
  // navigation resolves only once the dialog is answered.
  const navigateAway = () => router.history.push(AWAY_PATH)
  return { ...result, router, navigateAway }
}

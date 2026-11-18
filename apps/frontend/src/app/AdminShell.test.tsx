import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, screen, within } from "@testing-library/react"

import { AdminShell } from "@/app/AdminShell"
import { renderWithRouter } from "@/test/renderWithRouter"

import { newReportsCountQueryOptions } from "@/features/admin/api/reportQueryOptions"
import { useAdminSession } from "@/features/admin/hooks/useAdminSession"
import { useAdminSignOut } from "@/features/admin/hooks/useAdminSignOut"

vi.mock("@/features/admin/hooks/useAdminSession", () => ({ useAdminSession: vi.fn() }))
vi.mock("@/features/admin/hooks/useAdminSignOut", () => ({ useAdminSignOut: vi.fn() }))

// #240: the count of new reports is set up front, so nothing is fetched.
const withQueries = (ui: ReactNode, newReports = 0) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(newReportsCountQueryOptions().queryKey, newReports)
  return <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
}

describe("AdminShell", () => {
  const mutate = vi.fn()

  beforeEach(() => {
    vi.mocked(useAdminSession).mockReturnValue({
      administrator: { id: "a1", name: "Správce Jan", email: "jan@example.com" },
    })
    vi.mocked(useAdminSignOut).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useAdminSignOut>)
  })

  it("has the administration's own navigation instead of the app's", async () => {
    await renderWithRouter(withQueries(<AdminShell>obsah</AdminShell>))

    const nav = screen.getByRole("navigation", { name: "Navigace administrace" })
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/admin/attention",
      "/admin/reports",
      "/admin/users",
      "/admin/events",
      "/admin/groups",
      "/admin/administrators",
    ])
    expect(screen.queryByRole("navigation", { name: "Hlavní navigace" })).not.toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("obsah")
  })

  it("names the signed-in administrator and signs them out", async () => {
    await renderWithRouter(withQueries(<AdminShell>obsah</AdminShell>))

    expect(screen.getByText(/Správce Jan/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Odhlásit" }))
    expect(mutate).toHaveBeenCalled()
  })

  it("leads back to the app, where an administrator may be a user too", async () => {
    await renderWithRouter(withQueries(<AdminShell>obsah</AdminShell>))

    expect(screen.getByRole("link", { name: "Do aplikace" })).toHaveAttribute("href", "/")
  })

  it("says how many reports nobody has taken up yet", async () => {
    await renderWithRouter(withQueries(<AdminShell>obsah</AdminShell>, 3))

    expect(screen.getByRole("link", { name: "Nahlášení 3 nová nahlášení" })).toHaveAttribute(
      "href",
      "/admin/reports",
    )
  })

  it("shows no count when there is nothing new", async () => {
    await renderWithRouter(withQueries(<AdminShell>obsah</AdminShell>, 0))

    expect(screen.getByRole("link", { name: "Nahlášení" })).toBeInTheDocument()
  })
})

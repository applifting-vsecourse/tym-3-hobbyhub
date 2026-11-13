import { fireEvent, screen, within } from "@testing-library/react"

import { AdminShell } from "@/app/AdminShell"
import { renderWithRouter } from "@/test/renderWithRouter"

import { useAdminSession } from "@/features/admin/hooks/useAdminSession"
import { useAdminSignOut } from "@/features/admin/hooks/useAdminSignOut"

vi.mock("@/features/admin/hooks/useAdminSession", () => ({ useAdminSession: vi.fn() }))
vi.mock("@/features/admin/hooks/useAdminSignOut", () => ({ useAdminSignOut: vi.fn() }))

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
    await renderWithRouter(<AdminShell>obsah</AdminShell>)

    const nav = screen.getByRole("navigation", { name: "Navigace administrace" })
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/admin/users", "/admin/events", "/admin/groups", "/admin/administrators"])
    expect(screen.queryByRole("navigation", { name: "Hlavní navigace" })).not.toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("obsah")
  })

  it("names the signed-in administrator and signs them out", async () => {
    await renderWithRouter(<AdminShell>obsah</AdminShell>)

    expect(screen.getByText(/Správce Jan/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Odhlásit" }))
    expect(mutate).toHaveBeenCalled()
  })
})

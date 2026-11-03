import { screen } from "@testing-library/react"

import { AppShell } from "@/app/AppShell"
import { renderWithRouter } from "@/test/renderWithRouter"

import { useSession } from "@/features/auth/hooks/useSession"

vi.mock("@/features/auth/hooks/useSession", () => ({ useSession: vi.fn() }))
// The real menu and bell need the query client; the shell only places them.
vi.mock("@/features/auth/components/HeaderMenu", () => ({ HeaderMenu: () => null }))
vi.mock("@/features/notification/components/NotificationBell", () => ({
  NotificationBell: () => <button type="button">zvoneček</button>,
}))

const session = (
  user: { id: string; name: string; email: string; emailVerified: boolean } | null,
) => vi.mocked(useSession).mockReturnValue({ user, isPending: false, error: null })

describe("AppShell", () => {
  it("shows the navigation and Přidat to a signed-in user", async () => {
    session({ id: "u1", name: "Jana Nováková", email: "jana@example.com", emailVerified: true })
    await renderWithRouter(<AppShell>obsah</AppShell>)

    // Header nav and bottom nav: two landmarks with the same name.
    expect(screen.getAllByRole("navigation", { name: "Hlavní navigace" })).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: "Přidat" })).not.toHaveLength(0)
    expect(screen.getByRole("button", { name: "zvoneček" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("obsah")
  })

  it("keeps the navigation from a visitor", async () => {
    session(null)
    await renderWithRouter(<AppShell>obsah</AppShell>)

    expect(screen.queryByRole("navigation", { name: "Hlavní navigace" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Přidat" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "zvoneček" })).not.toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("obsah")
  })
})

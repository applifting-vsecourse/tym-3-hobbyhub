import { screen, within } from "@testing-library/react"

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
  it("shows the whole navigation, Přidat and the bell to a signed-in user", async () => {
    session({ id: "u1", name: "Jana Nováková", email: "jana@example.com", emailVerified: true })
    await renderWithRouter(<AppShell>obsah</AppShell>)

    // Header nav and bottom nav: two landmarks with the same name.
    const navs = screen.getAllByRole("navigation", { name: "Hlavní navigace" })
    expect(navs).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: "Moje akce" })).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: "Přidat" })).not.toHaveLength(0)
    expect(screen.getByRole("button", { name: "zvoneček" })).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("obsah")
  })

  it("gives a visitor Objevovat, Přidat and Skupiny, without the bell (#151)", async () => {
    session(null)
    await renderWithRouter(<AppShell>obsah</AppShell>)

    const navs = screen.getAllByRole("navigation", { name: "Hlavní navigace" })
    expect(navs).toHaveLength(2)
    for (const nav of navs) {
      expect(within(nav).getByRole("link", { name: "Objevovat" })).toHaveAttribute("href", "/events")
      expect(within(nav).getByRole("link", { name: "Skupiny" })).toHaveAttribute("href", "/groups")
      expect(within(nav).queryByRole("link", { name: "Moje akce" })).not.toBeInTheDocument()
      expect(within(nav).queryByRole("link", { name: "Profil" })).not.toBeInTheDocument()
    }
    expect(screen.getAllByRole("link", { name: "Přidat" })).not.toHaveLength(0)
    expect(screen.queryByRole("button", { name: "zvoneček" })).not.toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveTextContent("obsah")
  })
})

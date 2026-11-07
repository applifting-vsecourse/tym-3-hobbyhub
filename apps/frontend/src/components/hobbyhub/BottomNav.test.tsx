import { screen } from "@testing-library/react"

import { BottomNav } from "@/components/hobbyhub/BottomNav"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("BottomNav", () => {
  it("is made of links and marks the current section", async () => {
    await renderWithRouter(
      <BottomNav
        active="groups"
        isSignedIn
      />,
    )

    const nav = screen.getByRole("navigation", { name: "Hlavní navigace" })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Skupiny" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Objevovat" })).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("link", { name: "Objevovat" })).toHaveAttribute("href", "/events")
    expect(screen.getByRole("link", { name: "Přidat" })).toHaveAttribute("href", "/events/new")
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("marks Přidat on the new-event form", async () => {
    await renderWithRouter(
      <BottomNav
        active="add"
        isSignedIn
      />,
    )

    expect(screen.getByRole("link", { name: "Přidat" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Objevovat" })).not.toHaveAttribute("aria-current")
  })

  it("highlights nothing on pages outside the sections", async () => {
    await renderWithRouter(
      <BottomNav
        active={null}
        isSignedIn
      />,
    )

    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument()
  })

  it("names the new requests on Moje akce", async () => {
    await renderWithRouter(
      <BottomNav
        active="discover"
        isSignedIn
        hasNewRequests
      />,
    )

    expect(screen.getByRole("link", { name: "Moje akce, nové žádosti" })).toHaveAttribute(
      "href",
      "/my-events",
    )
  })

  it("gives a visitor Objevovat, Přidat and Skupiny, in that order (#151)", async () => {
    await renderWithRouter(
      <BottomNav
        active="discover"
        isSignedIn={false}
      />,
    )

    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(["Objevovat", "Přidat", "Skupiny"])
    expect(links[0]).toHaveAttribute("aria-current", "page")
    expect(links[1]).toHaveAttribute("href", "/events/new")
    expect(screen.queryByRole("link", { name: "Moje akce" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Profil" })).not.toBeInTheDocument()
  })
})

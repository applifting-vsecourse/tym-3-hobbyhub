import { screen } from "@testing-library/react"

import { renderWithRouter } from "@/test/renderWithRouter"

import { FriendsSection } from "@/features/friendship/components/FriendsSection"

describe("FriendsSection", () => {
  it("offers the three tabs in order, each kept in the URL", async () => {
    await renderWithRouter(<FriendsSection tab="search" />)

    expect(screen.getByRole("heading", { level: 1, name: "Přátelé" })).toBeInTheDocument()
    const tabs = screen.getByRole("navigation", { name: "Části sekce Přátelé" })
    const links = Array.from(tabs.querySelectorAll("a"))
    expect(links.map((link) => link.textContent)).toEqual([
      "Vyhledat uživatele",
      "Přátelé",
      "Žádosti",
    ])
    expect(links[0]).toHaveAttribute("href", "/friends")
    expect(links[0]).toHaveAttribute("aria-current", "page")
    expect(links[1]).toHaveAttribute("href", "/friends?tab=friends")
    expect(links[2]).toHaveAttribute("href", "/friends?tab=requests")
  })

  it("explains the empty search, without a link to itself", async () => {
    await renderWithRouter(<FriendsSection tab="search" />)

    expect(screen.getByText(/Zatím tu nic není\. Brzy tu půjde najít lidi/)).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Vyhledat uživatele" })).toHaveLength(1)
  })

  it.each([
    ["friends", /Zatím tu nikoho nemáte/],
    ["requests", /Žádosti o přátelství, které vám lidé pošlou/],
  ] as const)("explains the empty %s tab and leads to the search", async (tab, text) => {
    await renderWithRouter(<FriendsSection tab={tab} />)

    expect(screen.getByText(text)).toBeInTheDocument()
    const tabs = screen.getByRole("navigation", { name: "Části sekce Přátelé" })
    expect(tabs.querySelector('[aria-current="page"]')).toHaveTextContent(
      tab === "friends" ? "Přátelé" : "Žádosti",
    )
    // One link in the tabs, one under the explanation.
    const toSearch = screen.getAllByRole("link", { name: "Vyhledat uživatele" })
    expect(toSearch).toHaveLength(2)
    expect(toSearch[1]).toHaveAttribute("href", "/friends")
  })
})

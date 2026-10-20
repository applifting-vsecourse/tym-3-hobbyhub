import { screen } from "@testing-library/react"

import { HeaderNav } from "@/components/Header/HeaderNav"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("HeaderNav", () => {
  it("links the three places and marks the current one", async () => {
    await renderWithRouter(<HeaderNav active="discover" />)

    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(["Objevovat", "Moje akce", "Skupiny"])
    expect(links[0]).toHaveAttribute("aria-current", "page")
    expect(links[1]).toHaveAttribute("href", "/my-events")
    expect(links[2]).toHaveAttribute("href", "/groups")
  })
})

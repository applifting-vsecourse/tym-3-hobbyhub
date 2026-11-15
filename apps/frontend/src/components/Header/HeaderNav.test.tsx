import { screen } from "@testing-library/react"

import { HeaderNav } from "@/components/Header/HeaderNav"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("HeaderNav", () => {
  it("links the three places of a signed-in user and marks the current one", async () => {
    await renderWithRouter(
      <HeaderNav
        active="discover"
        isSignedIn
      />,
    )

    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(["Akce", "Moje akce", "Skupiny"])
    expect(links[0]).toHaveAttribute("aria-current", "page")
    expect(links[1]).toHaveAttribute("href", "/my-events")
    expect(links[2]).toHaveAttribute("href", "/groups")
  })

  it("links only the public places for a visitor (#151)", async () => {
    await renderWithRouter(
      <HeaderNav
        active="groups"
        isSignedIn={false}
      />,
    )

    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(["Akce", "Skupiny"])
    expect(links[0]).toHaveAttribute("href", "/events")
    expect(links[1]).toHaveAttribute("aria-current", "page")
  })
})

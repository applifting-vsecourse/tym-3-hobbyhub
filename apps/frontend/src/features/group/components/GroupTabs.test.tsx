import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { GroupTabs } from "@/features/group/components/GroupTabs"

describe("GroupTabs", () => {
  it("links every tab to its URL and marks the one on screen", async () => {
    await renderWithRouter(<GroupTabs active="discover" />)

    const mine = screen.getByRole("link", { name: "Moje skupiny" })
    const discover = screen.getByRole("link", { name: "Objevit" })
    expect(mine).toHaveAttribute("href", "/groups?tab=mine")
    expect(mine).not.toHaveAttribute("aria-current")
    expect(discover).toHaveAttribute("href", "/groups")
    expect(discover).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Žádosti" })).toHaveAttribute(
      "href",
      "/groups?tab=requests",
    )
  })

  it("lists Objevit first", async () => {
    await renderWithRouter(<GroupTabs active="mine" />)

    const names = screen.getAllByRole("link").map((link) => link.textContent)
    expect(names).toEqual(["Objevit", "Moje skupiny", "Žádosti"])
  })
})

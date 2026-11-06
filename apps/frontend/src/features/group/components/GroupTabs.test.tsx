import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { GroupTabs } from "@/features/group/components/GroupTabs"

describe("GroupTabs", () => {
  it("links both tabs to their URL and marks the one on screen", async () => {
    await renderWithRouter(<GroupTabs active="discover" />)

    const mine = screen.getByRole("link", { name: "Moje skupiny" })
    const discover = screen.getByRole("link", { name: "Objevit" })
    expect(mine).toHaveAttribute("href", "/groups")
    expect(mine).not.toHaveAttribute("aria-current")
    expect(discover).toHaveAttribute("href", "/groups?tab=discover")
    expect(discover).toHaveAttribute("aria-current", "page")
  })
})

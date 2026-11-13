import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageTab, PageTabs } from "@/components/hobbyhub/PageTabs"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("PageTabs", () => {
  it("marks the tab the page says is on, not the one the router matches", async () => {
    // The test router is at "/": the router alone would call the first link current.
    await renderWithRouter(
      <PageTabs label="Taby">
        <PageTab
          to="/"
          search={{}}
          isActive={false}
        >
          První
        </PageTab>
        <PageTab
          to="/groups"
          search={{ tab: "mine" }}
          isActive
        >
          Druhý
        </PageTab>
      </PageTabs>,
    )

    const tabs = screen.getByRole("navigation", { name: "Taby" })
    const first = within(tabs).getByRole("link", { name: "První" })
    const second = within(tabs).getByRole("link", { name: "Druhý" })
    expect(first).not.toHaveAttribute("aria-current")
    expect(first).toHaveAttribute("data-state", "off")
    expect(second).toHaveAttribute("aria-current", "page")
    expect(second).toHaveAttribute("data-state", "on")
    expect(second).toHaveAttribute("href", "/groups?tab=mine")
  })
})

import { screen, within } from "@testing-library/react"

import { Footer } from "@/components/Footer"
import { renderWithRouter } from "@/test/renderWithRouter"

const footerLinks = () =>
  within(screen.getByRole("navigation", { name: "Patička" })).getAllByRole("link")

describe("Footer", () => {
  it("links the public places", async () => {
    await renderWithRouter(<Footer />)

    expect(footerLinks().map((link) => link.getAttribute("href"))).toEqual([
      "/events",
      "/groups",
      "/terms",
    ])
  })

  it("gives every link a 44 px touch target on phones", async () => {
    await renderWithRouter(<Footer />)

    for (const link of footerLinks()) {
      expect(link).toHaveClass("min-h-11", "inline-flex", "items-center")
    }
  })
})

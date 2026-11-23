import { screen, within } from "@testing-library/react"

import { Footer } from "@/components/Footer"
import { LanguageChoice } from "@/components/LanguageChoice"
import { renderWithRouter } from "@/test/renderWithRouter"

const footerLinks = () =>
  within(screen.getByRole("navigation", { name: "Patička" })).getAllByRole("link")

describe("Footer", () => {
  it("links the public places", async () => {
    await renderWithRouter(<Footer />)

    expect(footerLinks().map((link) => link.getAttribute("href"))).toEqual([
      "/events",
      "/groups",
      "/events/new",
      "/terms",
    ])
  })

  it("gives every link a 44 px touch target on phones", async () => {
    await renderWithRouter(<Footer />)

    for (const link of footerLinks()) {
      expect(link).toHaveClass("min-h-11", "inline-flex", "items-center")
    }
  })

  it("switches the language with the same toggle as the appearance (#215)", async () => {
    await renderWithRouter(<Footer language={<LanguageChoice />} />)

    expect(
      within(screen.getByLabelText("Jazyk"))
        .getAllByRole("radio")
        .map((option) => option.textContent),
    ).toEqual(["Čeština", "English"])
    expect(screen.getByRole("radio", { name: "Čeština" })).toBeChecked()
  })

  it("lets anyone pick the appearance, a visitor too (#215)", async () => {
    await renderWithRouter(<Footer />)

    const appearance = screen.getByLabelText("Vzhled")
    expect(
      within(appearance)
        .getAllByRole("radio")
        .map((option) => option.textContent),
    ).toEqual(["Světlý", "Tmavý", "Podle systému"])
  })
})

import { screen, within } from "@testing-library/react"

import { renderWithRouter } from "@/test/renderWithRouter"

import { HowItWorks } from "@/features/landing/components/HowItWorks"

describe("HowItWorks", () => {
  it("lists three steps, the event first and the crew last (#215)", async () => {
    await renderWithRouter(<HowItWorks />)

    const steps = within(screen.getByRole("list")).getAllByRole("listitem")

    expect(steps).toHaveLength(3)
    expect(
      steps.map((step) => within(step).getByRole("heading", { level: 3 }).textContent),
    ).toEqual(["Najdi akci", "Přidej se", "Zahraj si a najdi partu"])
  })

  it("leads to the events from inside the frame", async () => {
    await renderWithRouter(<HowItWorks />)

    expect(screen.getByRole("link", { name: "Najít akci" })).toHaveAttribute("href", "/events")
  })
})

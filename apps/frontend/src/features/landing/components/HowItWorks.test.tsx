import { screen, within } from "@testing-library/react"

import { renderWithRouter } from "@/test/renderWithRouter"

import { HowItWorks } from "@/features/landing/components/HowItWorks"

describe("HowItWorks", () => {
  it("lists four steps, each with a heading and one line", async () => {
    await renderWithRouter(<HowItWorks />)

    const steps = within(screen.getByRole("list")).getAllByRole("listitem")

    expect(steps).toHaveLength(4)
    for (const step of steps) {
      expect(within(step).getByRole("heading", { level: 3 })).toBeInTheDocument()
    }
  })
})

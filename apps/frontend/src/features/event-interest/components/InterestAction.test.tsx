import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { InterestAction } from "@/features/event-interest/components/InterestAction"

describe("InterestAction", () => {
  it("is a toggle: Zajímá mě, then Uloženo, pressed", async () => {
    const onToggle = vi.fn()
    const { rerender } = await renderWithRouter(
      <InterestAction
        isSaved={false}
        onToggle={onToggle}
      />,
    )

    const button = screen.getByRole("button", { name: "Zajímá mě" })
    expect(button).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()

    rerender(
      <InterestAction
        isSaved
        onToggle={onToggle}
      />,
    )
    expect(await screen.findByRole("button", { name: "Uloženo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("sends a visitor to sign in and back to the event", async () => {
    await renderWithRouter(<InterestAction signInFrom="/events/e1" />)

    expect(screen.getByRole("link", { name: "Zajímá mě" })).toHaveAttribute(
      "href",
      "/login?from=%2Fevents%2Fe1",
    )
  })
})

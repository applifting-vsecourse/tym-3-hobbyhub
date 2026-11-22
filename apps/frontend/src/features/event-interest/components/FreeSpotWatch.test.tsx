import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { FreeSpotWatch } from "@/features/event-interest/components/FreeSpotWatch"

describe("FreeSpotWatch", () => {
  it("is a toggle that says what watching means and that no seat is held", async () => {
    const onToggle = vi.fn()
    const { rerender } = await renderWithRouter(
      <FreeSpotWatch
        isWatching={false}
        onToggle={onToggle}
      />,
    )

    const button = screen.getByRole("button", { name: "Hlídat volné místo" })
    expect(button).toHaveAttribute("aria-pressed", "false")
    expect(button).toHaveAccessibleDescription(/Akce je plná/)
    await userEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()

    rerender(
      <FreeSpotWatch
        isWatching
        onToggle={onToggle}
      />,
    )
    const pressed = await screen.findByRole("button", { name: "Hlídám volné místo" })
    expect(pressed).toHaveAttribute("aria-pressed", "true")
    expect(pressed).toHaveAccessibleDescription(/pošleme vám upozornění.*Místo vám nedržíme/)
  })

  it("sends a visitor to sign in and back to the event", async () => {
    await renderWithRouter(<FreeSpotWatch signInFrom="/events/e1" />)

    expect(screen.getByRole("link", { name: "Hlídat volné místo" })).toHaveAttribute(
      "href",
      "/login?from=%2Fevents%2Fe1",
    )
  })
})

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { ShareEventAction } from "@/features/event/components/ShareEventAction"

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const event = {
  id: "e1",
  title: "florbal",
  startAt: new Date(2030, 9, 22, 19, 0),
  takenCount: 7,
  minParticipants: 8,
}

describe("ShareEventAction", () => {
  it("opens a panel with the public link and a message saying who is missing", async () => {
    render(<ShareEventAction event={event} />)

    await userEvent.click(screen.getByRole("button", { name: "Sdílet do chatu" }))

    expect(
      await screen.findByText(/florbal \(.*\), chybí 1\. Potvrď, jestli jdeš:/),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "odkaz na akci" })).toHaveAttribute(
      "href",
      `${window.location.origin}/events/e1`,
    )
  })

  it("leaves out the missing count once the minimum is reached", async () => {
    render(<ShareEventAction event={{ ...event, takenCount: 8 }} />)

    await userEvent.click(screen.getByRole("button", { name: "Sdílet do chatu" }))

    expect(await screen.findByText(/florbal \(.*\)\. Potvrď, jestli jdeš:/)).toBeInTheDocument()
  })

  it("offers every chat target with a name, sending the link or message where it should go", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(<ShareEventAction event={event} />)

    await userEvent.click(screen.getByRole("button", { name: "Sdílet do chatu" }))

    expect(await screen.findByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/?text="),
    )
    expect(screen.getByRole("link", { name: "Facebook skupina" })).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent(`${window.location.origin}/events/e1`)),
    )

    await userEvent.click(screen.getByRole("button", { name: "Messenger" }))
    expect(writeText).toHaveBeenLastCalledWith(
      expect.stringMatching(/chybí 1\. Potvrď, jestli jdeš: .*\/events\/e1$/),
    )

    await userEvent.click(screen.getByRole("button", { name: "Zkopírovat odkaz" }))
    expect(writeText).toHaveBeenLastCalledWith(`${window.location.origin}/events/e1`)
  })
})

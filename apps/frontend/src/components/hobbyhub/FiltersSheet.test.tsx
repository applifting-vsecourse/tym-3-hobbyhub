import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { EMPTY_FILTERS, FiltersSheet } from "@/components/hobbyhub/FiltersSheet"

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe("FiltersSheet", () => {
  it("applies the draft only when the result button is pressed", async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <FiltersSheet
        isOpen
        onOpenChange={onOpenChange}
        value={EMPTY_FILTERS}
        onApply={onApply}
        countResults={(filters) => (filters.activities.length > 0 ? 3 : 24)}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Volejbal" }))
    await user.click(screen.getByRole("radio", { name: "Víkend" }))
    expect(onApply).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Zobrazit 3 akce" }))
    expect(onApply).toHaveBeenCalledWith({
      activities: ["volejbal"],
      when: "weekend",
      location: "",
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

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

    await user.click(screen.getByRole("combobox", { name: "Aktivita" }))
    await user.click(await screen.findByRole("option", { name: "Volejbal" }))
    await user.keyboard("{Escape}")
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

  it("offers only the requested filters, with the given activities", async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(
      <FiltersSheet
        isOpen
        onOpenChange={vi.fn()}
        value={{ ...EMPTY_FILTERS, activities: ["a1"] }}
        onApply={onApply}
        fields={["activity"]}
        activityOptions={[
          { id: "a3", label: "Volejbal", icon: "volejbal" },
          { id: "a1", label: "Florbal", icon: "florbal" },
          { id: "a2", label: "Šachy", icon: "sachy" },
        ]}
      />,
    )

    expect(screen.queryByText("Kdy")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Lokalita")).not.toBeInTheDocument()
    const combobox = screen.getByRole("combobox", { name: "Aktivita" })
    expect(combobox).toHaveTextContent("Florbal")

    await user.click(combobox)
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual([
      "Florbal",
      "Šachy",
      "Volejbal",
    ])
    expect(screen.getByRole("option", { name: "Florbal" })).toHaveAttribute("aria-checked", "true")

    await user.click(screen.getByRole("option", { name: "Šachy" }))
    await user.keyboard("{Escape}")
    expect(combobox).toHaveTextContent("2 aktivity")

    await user.click(screen.getByRole("button", { name: "Zobrazit výsledky" }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ activities: ["a1", "a2"] }))
  })

  it("says why there are no activities and lets a failed request be retried", async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const props = {
      isOpen: true,
      onOpenChange: vi.fn(),
      value: EMPTY_FILTERS,
      onApply: vi.fn(),
      fields: ["activity" as const],
      activityOptions: [],
    }
    const { rerender } = render(
      <FiltersSheet
        {...props}
        activitiesState={{ isLoading: true, error: null, onRetry }}
      />,
    )
    expect(screen.getByText("Načítáme aktivity…")).toBeInTheDocument()

    rerender(
      <FiltersSheet
        {...props}
        activitiesState={{ isLoading: false, error: new Error("boom"), onRetry }}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()

    rerender(
      <FiltersSheet
        {...props}
        activitiesState={{ isLoading: false, error: null, onRetry }}
      />,
    )
    expect(screen.getByText("Zatím tu nejsou žádné aktivity.")).toBeInTheDocument()
  })
})

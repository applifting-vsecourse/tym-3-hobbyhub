import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FiltersPanel } from "@/components/hobbyhub/FiltersPanel"
import { EMPTY_FILTERS } from "@/components/hobbyhub/FiltersSheet"

const renderPanel = (props: Partial<Parameters<typeof FiltersPanel>[0]> = {}) => {
  const onApply = vi.fn()
  const onExpandedChange = vi.fn()
  const view = render(
    <FiltersPanel
      value={EMPTY_FILTERS}
      onApply={onApply}
      isExpanded
      onExpandedChange={onExpandedChange}
      activeCount={0}
      fields={["when", "location"]}
      {...props}
    />,
  )
  return { ...view, onApply, onExpandedChange }
}

describe("FiltersPanel", () => {
  it("keeps the changes a draft until „Použít“", async () => {
    const user = userEvent.setup()
    const { onApply } = renderPanel()

    expect(screen.getByRole("complementary", { name: "Filtry" })).toBeInTheDocument()
    await user.type(screen.getByLabelText("Lokalita"), "Praha 8")
    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent("Změny se projeví po stisku Použít.")

    await user.click(screen.getByRole("button", { name: "Použít" }))
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_FILTERS, location: "Praha 8" })
  })

  it("does not apply a reversed date range", async () => {
    const user = userEvent.setup()
    const { onApply } = renderPanel()

    await user.type(screen.getByLabelText("Od data"), "2026-11-20")
    await user.type(screen.getByLabelText("Do data"), "2026-11-10")
    expect(screen.getByRole("alert")).toHaveTextContent("Konec rozsahu nemůže být před začátkem.")

    await user.click(screen.getByRole("button", { name: "Použít" }))
    expect(onApply).not.toHaveBeenCalled()
  })

  it("starts the draft again when the applied filters change outside it", () => {
    const { rerender, onApply, onExpandedChange } = renderPanel({
      value: { ...EMPTY_FILTERS, location: "Praha 8" },
    })
    expect(screen.getByLabelText("Lokalita")).toHaveValue("Praha 8")

    // A chip of the place was removed under the search field.
    rerender(
      <FiltersPanel
        value={EMPTY_FILTERS}
        onApply={onApply}
        isExpanded
        onExpandedChange={onExpandedChange}
        activeCount={0}
        fields={["when", "location"]}
      />,
    )
    expect(screen.getByLabelText("Lokalita")).toHaveValue("")
  })

  it("folds into a strip that says how many filters are on", async () => {
    const user = userEvent.setup()
    const { onExpandedChange } = renderPanel()

    await user.click(screen.getByRole("button", { name: "Skrýt filtry" }))
    expect(onExpandedChange).toHaveBeenCalledWith(false)
  })

  it("opens again from the folded strip", async () => {
    const user = userEvent.setup()
    const { onExpandedChange } = renderPanel({ isExpanded: false, activeCount: 2 })

    expect(screen.queryByLabelText("Lokalita")).not.toBeInTheDocument()
    const open = screen.getByRole("button", { name: "Zobrazit filtry (2 aktivní filtry)" })
    expect(open).toHaveAttribute("aria-expanded", "false")

    await user.click(open)
    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })
})

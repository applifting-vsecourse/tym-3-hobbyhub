import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { FiltersPanel } from "@/components/hobbyhub/FiltersPanel"
import { EMPTY_FILTERS } from "@/components/hobbyhub/FiltersSheet"

// The suggestions come from the geocoder; here a button picks a place.
vi.mock("@/components/hobbyhub/AddressSearch", () => ({
  AddressSearch: ({
    value,
    onSelect,
  }: {
    value: string
    onSelect: (address: { label: string; latitude: number; longitude: number }) => void
  }) => (
    <button
      type="button"
      onClick={() => onSelect({ label: "Praha 8", latitude: 50.1, longitude: 14.45 })}
    >
      {value || "Vybrat místo"}
    </button>
  ),
}))

const renderPanel = (value = EMPTY_FILTERS) => {
  const onApply = vi.fn()
  render(
    <FiltersPanel
      value={value}
      onApply={onApply}
      isExpanded
      onExpandedChange={vi.fn()}
      activeCount={0}
      fields={["place"]}
    />,
  )
  return { onApply }
}

// #261: a picked place comes with a radius, preselected to 10 km.
describe("the place filter", () => {
  it("offers no radius until a place is picked, then preselects 10 km", async () => {
    const user = userEvent.setup()
    renderPanel()
    expect(screen.queryByRole("group", { name: "Okruh" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Vybrat místo" }))

    expect(screen.getByRole("button", { name: "10 km" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getAllByRole("button", { name: /^\d+ km$/ })).toHaveLength(4)
  })

  it("applies the place with the chosen radius", async () => {
    const user = userEvent.setup()
    const { onApply } = renderPanel()

    await user.click(screen.getByRole("button", { name: "Vybrat místo" }))
    await user.click(screen.getByRole("button", { name: "25 km" }))
    await user.click(screen.getByRole("button", { name: "Použít" }))

    expect(onApply).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      place: { label: "Praha 8", latitude: 50.1, longitude: 14.45 },
      radiusKm: 25,
    })
  })

  it("clears the place in one step and drops the radius", async () => {
    const user = userEvent.setup()
    const { onApply } = renderPanel({
      ...EMPTY_FILTERS,
      place: { label: "Praha 8", latitude: 50.1, longitude: 14.45 },
      radiusKm: 25,
    })

    await user.click(screen.getByRole("button", { name: "Zrušit výběr místa" }))
    expect(screen.queryByRole("group", { name: "Okruh" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Použít" }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ place: null }))
  })
})

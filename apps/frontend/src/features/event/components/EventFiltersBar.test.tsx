import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { EventFiltersBar } from "@/features/event/components/EventFiltersBar"
import type { EventFilterValues } from "@/features/event/lib/eventsSearch"

// jsdom has no matchMedia; pretend to be a desktop so the panel renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const NONE: EventFilterValues = {
  activityIds: [],
  search: "",
  location: "",
  dateFrom: "",
  dateTo: "",
  freeSpotsOnly: false,
  priceFrom: "",
  priceTo: "",
  hoursFrom: "",
  hoursTo: "",
  capacityFrom: "",
  capacityTo: "",
}

const renderBar = (
  filters: Partial<EventFilterValues> = {},
  props: Partial<Parameters<typeof EventFiltersBar>[0]> = {},
) => {
  const onFiltersChange = vi.fn()
  const onSearchTextChange = vi.fn()
  render(
    <EventFiltersBar
      filters={{ ...NONE, ...filters }}
      isRangeReversed={false}
      searchText=""
      onSearchTextChange={onSearchTextChange}
      onFiltersChange={onFiltersChange}
      activityOptions={[{ id: "a1", label: "Florbal", icon: "florbal" }]}
      activitiesState={{ isLoading: false, error: null, onRetry: vi.fn() }}
      {...props}
    />,
  )
  return { onFiltersChange, onSearchTextChange }
}

describe("EventFiltersBar", () => {
  it("passes what is typed to the page", async () => {
    const { onSearchTextChange } = renderBar()

    await userEvent.type(screen.getByRole("searchbox"), "f")

    expect(onSearchTextChange).toHaveBeenCalledWith("f")
  })

  it("shows no chips without a filter", () => {
    renderBar()

    expect(screen.queryByRole("group", { name: "Vybrané filtry" })).not.toBeInTheDocument()
  })

  it("shows each chosen filter as a chip that removes it", async () => {
    const { onFiltersChange } = renderBar({
      activityIds: ["a1"],
      location: "Brno",
      dateFrom: "2026-11-15",
      dateTo: "2026-11-30",
    })

    await userEvent.click(screen.getByRole("button", { name: "Florbal" }))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ activityIds: [] })
    await userEvent.click(screen.getByRole("button", { name: "Brno" }))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ location: "" })
    await userEvent.click(screen.getByRole("button", { name: /15\. 11\./ }))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ dateFrom: "", dateTo: "" })
  })

  it("shows the ranges and the free-spot switch as chips that remove them (#214)", async () => {
    const { onFiltersChange } = renderBar({
      freeSpotsOnly: true,
      priceFrom: "0",
      priceTo: "200",
      hoursFrom: "1",
      capacityTo: "12",
    })

    await userEvent.click(screen.getByRole("button", { name: "Volná místa" }))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ freeSpotsOnly: false })
    await userEvent.click(screen.getByRole("button", { name: "0–200 Kč" }))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ priceFrom: "", priceTo: "" })
    await userEvent.click(screen.getByRole("button", { name: "od 1 h" }))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ hoursFrom: "", hoursTo: "" })
    await userEvent.click(screen.getByRole("button", { name: "Kapacita do 12" }))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ capacityFrom: "", capacityTo: "" })
  })

  it("applies the ready-made choices picked in the panel (#214)", async () => {
    const { onFiltersChange } = renderBar({}, { fields: ["price", "capacity", "freeSpots"] })

    await userEvent.click(screen.getByRole("button", { name: /filtr/i }))
    await userEvent.click(screen.getByRole("button", { name: "Do 300 Kč" }))
    await userEvent.click(screen.getByRole("button", { name: "7–12 lidí" }))
    await userEvent.click(screen.getByRole("button", { name: "Jen s volnými místy" }))
    await userEvent.click(screen.getByRole("button", { name: "Zobrazit výsledky" }))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        priceFrom: "",
        priceTo: "300",
        capacityFrom: "7",
        capacityTo: "12",
        freeSpotsOnly: true,
      }),
    )
  })

  it("takes a choice back when it is pressed again", async () => {
    const { onFiltersChange } = renderBar({ priceTo: "0" }, { fields: ["price"] })

    await userEvent.click(screen.getByRole("button", { name: /filtr/i }))
    await userEvent.click(screen.getByRole("button", { name: "Zdarma" }))
    await userEvent.click(screen.getByRole("button", { name: "Zobrazit výsledky" }))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceFrom: "", priceTo: "" }),
    )
  })

  it("lets a custom range be typed, and opens it for a value no choice matches", async () => {
    const { onFiltersChange } = renderBar({ priceTo: "250" }, { fields: ["price"] })

    await userEvent.click(screen.getByRole("button", { name: /filtr/i }))
    const from = screen.getByLabelText("Cena za místo (Kč): Od")
    expect(screen.getByLabelText("Cena za místo (Kč): Do")).toHaveValue(250)
    await userEvent.type(from, "50")
    await userEvent.click(screen.getByRole("button", { name: "Zobrazit výsledky" }))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceFrom: "50", priceTo: "250" }),
    )
  })

  it("keeps the custom fields open while a value is cleared or matches a choice", async () => {
    renderBar({ priceTo: "250" }, { fields: ["price"] })

    await userEvent.click(screen.getByRole("button", { name: /filtr/i }))
    const to = screen.getByLabelText("Cena za místo (Kč): Do")
    await userEvent.clear(to)
    expect(screen.getByLabelText("Cena za místo (Kč): Do")).toBeInTheDocument()
    await userEvent.type(to, "100")
    expect(screen.getByLabelText("Cena za místo (Kč): Do")).toHaveValue(100)
  })

  it("does not apply a value the server would refuse", async () => {
    const { onFiltersChange } = renderBar({}, { fields: ["capacity"] })

    await userEvent.click(screen.getByRole("button", { name: /filtr/i }))
    await userEvent.click(screen.getByRole("button", { name: "Vlastní" }))
    await userEvent.type(screen.getByLabelText("Kolik lidí se vejde (počet míst): Od"), "2.5")
    await userEvent.click(screen.getByRole("button", { name: "Zobrazit výsledky" }))

    expect(screen.getByRole("alert")).toHaveTextContent("povoleném rozsahu")
    expect(onFiltersChange).not.toHaveBeenCalled()
  })

  it("does not apply a reversed custom range from the panel", async () => {
    const { onFiltersChange } = renderBar({}, { fields: ["price"] })

    await userEvent.click(screen.getByRole("button", { name: /filtr/i }))
    await userEvent.click(screen.getByRole("button", { name: "Vlastní" }))
    await userEvent.type(screen.getByLabelText("Cena za místo (Kč): Od"), "300")
    await userEvent.type(screen.getByLabelText("Cena za místo (Kč): Do"), "100")
    await userEvent.click(screen.getByRole("button", { name: "Zobrazit výsledky" }))

    expect(screen.getByRole("alert")).toHaveTextContent("nesmí být větší")
    expect(onFiltersChange).not.toHaveBeenCalled()
  })

  it("keeps a chip for an activity that does not exist, so it can be removed", () => {
    renderBar({ activityIds: ["gone"] })

    expect(screen.getByRole("button", { name: "Neznámá aktivita" })).toBeInTheDocument()
  })

  it("says a reversed date range is not applied", () => {
    renderBar({}, { isRangeReversed: true })

    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("puts the page's own chips in front of the chosen filters", () => {
    renderBar({}, { leadingChips: <button type="button">Nejblíž mně</button> })

    expect(screen.getByRole("button", { name: "Nejblíž mně" })).toBeInTheDocument()
  })
})

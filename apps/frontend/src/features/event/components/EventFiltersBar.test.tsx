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

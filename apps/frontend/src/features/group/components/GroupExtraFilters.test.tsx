import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  GroupExtraFilters,
  type GroupExtraFilterValues,
} from "@/features/group/components/GroupExtraFilters"

const EMPTY: GroupExtraFilterValues = {
  weekdays: [],
  onlyWithUpcomingEvent: false,
  sort: "newest",
}

const renderFilters = (value = EMPTY, canUseDistance = false) => {
  const onChange = vi.fn()
  render(
    <GroupExtraFilters
      value={value}
      onChange={onChange}
      canUseDistance={canUseDistance}
    />,
  )
  return { onChange, user: userEvent.setup() }
}

describe("GroupExtraFilters", () => {
  it("adds and removes the days a group meets on", async () => {
    const { onChange, user } = renderFilters({ ...EMPTY, weekdays: [4] })

    expect(screen.getByRole("button", { name: "Čt" })).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: "So" }))
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, weekdays: [4, 6] })
    await user.click(screen.getByRole("button", { name: "Čt" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY, weekdays: [] })
  })

  it("narrows by how a group takes people in", async () => {
    const { onChange, user } = renderFilters()

    await user.click(screen.getByRole("button", { name: "Otevřená, bez schvalování" }))
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, approvalMode: "OPEN" })
  })

  it("keeps only groups with an event ahead", async () => {
    const { onChange, user } = renderFilters()

    await user.click(screen.getByRole("checkbox", { name: "Mají nadcházející akci" }))
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, onlyWithUpcomingEvent: true })
  })

  it("offers a radius only where there is a place to measure from", () => {
    renderFilters()
    expect(screen.queryByText("Okruh od domova")).not.toBeInTheDocument()
  })
})

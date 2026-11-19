import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import {
  GroupExtraFilters,
  type GroupExtraFilterValues,
} from "@/features/group/components/GroupExtraFilters"

const EMPTY: GroupExtraFilterValues = {
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
  it("keeps the filters folded until asked, with the order in sight", async () => {
    const { user } = renderFilters()

    expect(
      screen.queryByRole("checkbox", { name: "Mají nadcházející akci" }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Další filtry" }))
    expect(screen.getByRole("checkbox", { name: "Mají nadcházející akci" })).toBeVisible()
  })

  it("says how many filters are on, and opens when some are", () => {
    renderFilters({ ...EMPTY, approvalMode: "OPEN", onlyWithUpcomingEvent: true })

    expect(screen.getByRole("button", { name: /Další filtry\s?\(2\)/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
  })

  it("narrows by how a group takes people in", async () => {
    const { onChange, user } = renderFilters()

    await user.click(screen.getByRole("button", { name: "Další filtry" }))
    await user.click(screen.getByRole("button", { name: "Otevřená, bez schvalování" }))
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, approvalMode: "OPEN" })
  })

  it("keeps only groups with an event ahead", async () => {
    const { onChange, user } = renderFilters()

    await user.click(screen.getByRole("button", { name: "Další filtry" }))
    await user.click(screen.getByRole("checkbox", { name: "Mají nadcházející akci" }))
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY, onlyWithUpcomingEvent: true })
  })

  it("clears the filters in one go", async () => {
    const { onChange, user } = renderFilters({ ...EMPTY, approvalMode: "APPROVAL" })

    await user.click(screen.getByRole("button", { name: "Zrušit filtry" }))
    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY,
      approvalMode: undefined,
      radiusKm: undefined,
    })
  })

  it("offers a radius only where there is a place to measure from", async () => {
    const { user } = renderFilters()
    await user.click(screen.getByRole("button", { name: "Další filtry" }))

    expect(screen.queryByText("Okruh od domova")).not.toBeInTheDocument()
  })
})

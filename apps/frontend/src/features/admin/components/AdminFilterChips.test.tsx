import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { AdminFilterChips } from "@/features/admin/components/AdminFilterChips"

const options = [
  { value: undefined, label: "Všichni" },
  { value: "blocked" as const, label: "Zablokovaní" },
]

describe("AdminFilterChips", () => {
  it("marks the chosen filter and tells which one is on", () => {
    render(
      <AdminFilterChips
        label="Filtr uživatelů"
        value="blocked"
        options={options}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("group", { name: "Filtr uživatelů" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zablokovaní" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("button", { name: "Všichni" })).toHaveAttribute("aria-pressed", "false")
  })

  it("reports the filter clicked, and none for the first chip", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <AdminFilterChips
        label="Filtr uživatelů"
        value="blocked"
        options={options}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Všichni" }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})

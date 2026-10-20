import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Counter } from "@/components/hobbyhub/Counter"
import { Loader } from "@/components/hobbyhub/Loader"
import { SeatMeter } from "@/components/hobbyhub/SeatMeter"

describe("SeatMeter", () => {
  it("states the capacity in text", () => {
    render(
      <SeatMeter
        taken={7}
        min={10}
      />,
    )

    expect(screen.getByRole("img", { name: "Obsazeno 7 z 10, chybí 3" })).toBeInTheDocument()
  })
})

describe("Counter", () => {
  it("steps the value and stops at the bounds", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Counter
        label="Minimum"
        value={2}
        min={2}
        max={30}
        onValueChange={onValueChange}
      />,
    )

    expect(screen.getByRole("button", { name: "Minimum: méně" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Minimum: více" }))
    expect(onValueChange).toHaveBeenCalledWith(3)
  })

  it("takes a typed number as soon as it is within the bounds", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Counter
        label="Maximum"
        value={12}
        min={1}
        max={500}
        onValueChange={onValueChange}
      />,
    )

    const field = screen.getByRole("textbox", { name: "Maximum" })
    await user.clear(field)
    await user.type(field, "100")

    expect(onValueChange).toHaveBeenLastCalledWith(100)
    expect(field).toHaveValue("100")
  })

  it("clamps to the bounds when the field is left, and restores an empty one", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Counter
        label="Maximum"
        value={12}
        min={1}
        max={30}
        onValueChange={onValueChange}
      />,
    )
    const field = screen.getByRole("textbox", { name: "Maximum" })

    await user.clear(field)
    await user.type(field, "500")
    await user.tab()
    expect(onValueChange).toHaveBeenLastCalledWith(30)

    onValueChange.mockClear()
    await user.clear(field)
    await user.tab()
    expect(onValueChange).not.toHaveBeenCalled()
    expect(field).toHaveValue("12")
  })

  it("ignores letters", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Counter
        label="Minimum"
        value={2}
        onValueChange={onValueChange}
      />,
    )

    await user.type(screen.getByRole("textbox", { name: "Minimum" }), "a")

    expect(onValueChange).toHaveBeenCalledWith(2)
    expect(screen.getByRole("textbox", { name: "Minimum" })).toHaveValue("2")
  })
})

describe("Loader", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("appears only after 300 ms and always has a text label", () => {
    vi.useFakeTimers()
    render(<Loader variant="seats" />)

    expect(screen.queryByText("Načítáme soupisku…")).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole("status")).toHaveTextContent("Načítáme soupisku…")
  })
})

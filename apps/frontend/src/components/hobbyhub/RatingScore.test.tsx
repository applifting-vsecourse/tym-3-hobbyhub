import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RatingScore } from "@/components/hobbyhub/RatingScore"
import { StarRatingInput } from "@/components/hobbyhub/StarRatingInput"

describe("RatingScore", () => {
  it("says the average to tenths and the count, in words for a screen reader", () => {
    render(
      <RatingScore
        average={4.75}
        count={23}
      />,
    )

    expect(screen.getByRole("img")).toHaveAccessibleName("Hodnocení 4,8 z 5, 23 hodnocení")
  })

  it("leaves the count out when the viewer may not see it", () => {
    render(
      <RatingScore
        average={4}
        count={null}
      />,
    )

    expect(screen.getByRole("img")).toHaveAccessibleName("Hodnocení 4,0 z 5")
  })

  it("says there are not enough ratings yet without an average", () => {
    render(
      <RatingScore
        average={null}
        count={null}
      />,
    )

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByText("Zatím málo hodnocení")).toBeInTheDocument()
  })
})

function Labelled({ onValueChange }: { onValueChange: (stars: number) => void }) {
  const [stars, setStars] = useState<number | null>(null)
  return (
    <>
      <span id="label">Jak se ti akce líbila?</span>
      <StarRatingInput
        value={stars}
        onValueChange={(next) => {
          setStars(next)
          onValueChange(next)
        }}
        aria-labelledby="label"
      />
    </>
  )
}

describe("StarRatingInput", () => {
  it("offers five stars as one group of radios, named by count", () => {
    render(<Labelled onValueChange={vi.fn()} />)

    expect(screen.getByRole("radiogroup", { name: "Jak se ti akce líbila?" })).toBeInTheDocument()
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-label"))).toEqual([
      "1 hvězdička z 5",
      "2 hvězdičky z 5",
      "3 hvězdičky z 5",
      "4 hvězdičky z 5",
      "5 hvězdiček z 5",
    ])
  })

  it("picks the stars with a click, also on the drawn star", async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Labelled onValueChange={onValueChange} />)

    await user.click(screen.getByRole("radio", { name: "4 hvězdičky z 5" }))

    expect(onValueChange).toHaveBeenLastCalledWith(4)
    expect(screen.getByRole("radio", { name: "4 hvězdičky z 5" })).toBeChecked()
  })

  // The arrows move the focus; jsdom does not run Radix's "check on arrow
  // focus" (a browser does), so the space picks the star here.
  it("moves with the arrow keys and picks with the space", async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Labelled onValueChange={onValueChange} />)

    await user.tab()
    expect(screen.getByRole("radio", { name: "1 hvězdička z 5" })).toHaveFocus()
    await user.keyboard("{ArrowRight}{ArrowRight}[Space]")

    expect(onValueChange).toHaveBeenLastCalledWith(3)
    expect(screen.getByRole("radio", { name: "3 hvězdičky z 5" })).toHaveFocus()
    expect(screen.getByRole("radio", { name: "3 hvězdičky z 5" })).toBeChecked()
  })
})

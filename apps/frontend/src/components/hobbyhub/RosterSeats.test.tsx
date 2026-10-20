import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RosterSeats } from "@/components/hobbyhub/RosterSeats"

const seats = () =>
  Array.from(screen.getByRole("img").querySelectorAll("[data-slot=activity-avatar]"))

describe("RosterSeats", () => {
  it("draws only the seats missing to the minimum as missing", () => {
    render(
      <RosterSeats
        taken={2}
        min={3}
        capacity={6}
      />,
    )

    expect(seats()).toHaveLength(6)
    // Two people, one dashed seat with a plus, three plain rings.
    expect(seats().filter((seat) => seat.querySelector("img"))).toHaveLength(2)
    expect(seats().filter((seat) => seat.classList.contains("border-dashed"))).toHaveLength(1)
    expect(screen.getByRole("img")).toHaveAccessibleName("Obsazeno 2 z 6, chybí 1")
  })

  it("treats every empty seat as missing without a minimum", () => {
    render(
      <RosterSeats
        taken={1}
        capacity={4}
      />,
    )

    expect(seats().filter((seat) => seat.classList.contains("border-dashed"))).toHaveLength(3)
  })
})

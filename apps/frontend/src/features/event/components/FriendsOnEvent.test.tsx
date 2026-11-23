import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { FriendsOnEvent } from "@/features/event/components/FriendsOnEvent"

const friends = ["Adam", "Eva", "Libor", "Petr", "Zdeněk"].map((name, index) => ({
  id: `f${index}`,
  name,
  image: null,
}))

describe("FriendsOnEvent (#226)", () => {
  it("names three friends and lists them all on request", async () => {
    await renderWithRouter(
      <FriendsOnEvent
        friends={friends}
        period="upcoming"
        variant="band"
      />,
    )

    expect(screen.getByText(/Jdou vaši přátelé/)).toHaveTextContent(
      "Jdou vaši přátelé Adam, Eva, Libor a 2 další",
    )
    expect(screen.getAllByRole("link")).toHaveLength(3)

    const more = screen.getByRole("button", { name: "a 2 další" })
    expect(more).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(more)

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Adam",
      "Eva",
      "Libor",
      "Petr",
      "Zdeněk",
    ])
    expect(screen.getByRole("link", { name: "Zdeněk" })).toHaveAttribute("href", "/profile/f4")
    await userEvent.click(screen.getByRole("button", { name: "Zobrazit méně" }))
    expect(screen.getAllByRole("link")).toHaveLength(3)
  })

  it("says one friend goes, without a button for more", async () => {
    await renderWithRouter(
      <FriendsOnEvent
        friends={friends.slice(0, 1)}
        period="upcoming"
        variant="line"
      />,
    )

    expect(screen.getByText(/Z vašich přátel jde/)).toHaveTextContent("Z vašich přátel jde Adam")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("is not there without friends", async () => {
    await renderWithRouter(
      <FriendsOnEvent
        friends={[]}
        period="past"
        variant="band"
      />,
    )

    expect(screen.queryByText(/přátel/)).toBeNull()
  })
})

import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import {
  POPULAR_FIRST,
  POPULAR_MORE,
  PopularActivities,
  type PopularActivity,
} from "@/components/hobbyhub/PopularActivities"

const BALL = { id: "c-ball", name: "Míčové sporty", icon: "micove-sporty", order: 1 }
const OTHER = { id: "c-other", name: "Ostatní", icon: "ostatni", order: 14 }

// 70 activities: ranks 1–45 given in reverse, so the order must come from the rank;
// the rest unranked, "Ostatní" ones last.
const ACTIVITIES: PopularActivity[] = [
  ...Array.from({ length: 45 }, (_, index) => ({
    id: `ranked-${45 - index}`,
    name: `Oblíbená ${45 - index}`,
    icon: "fotbal",
    category: BALL,
    popularityRank: 45 - index,
  })),
  ...Array.from({ length: 20 }, (_, index) => ({
    id: `other-${index}`,
    name: `Jiná ${String(index).padStart(2, "0")}`,
    icon: "ostatni",
    category: OTHER,
    popularityRank: null,
  })),
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `ball-${index}`,
    name: `Míčová ${index}`,
    icon: "fotbal",
    category: BALL,
  })),
]

// "Vybrat …" buttons stand in for the search above the tags.
function Harness({ initial = [] }: { readonly initial?: string[] }) {
  const [chosen, setChosen] = useState<string[]>(initial)
  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  return (
    <>
      <button
        type="button"
        onClick={() => toggle("other-5")}
      >
        Vybrat Jiná 05
      </button>
      <button
        type="button"
        onClick={() => toggle("ranked-3")}
      >
        Vybrat Oblíbená 3
      </button>
      <PopularActivities
        activities={ACTIVITIES}
        activityLabel={(activity) => activity.name}
        chosenIds={chosen}
        onToggle={toggle}
      />
    </>
  )
}

// The tags are toggle buttons; "Načíst další" is a plain one.
const tagNames = () =>
  screen
    .getAllByRole("button")
    .filter((button) => button.hasAttribute("aria-pressed"))
    .map((button) => button.textContent)

describe("PopularActivities", () => {
  it("shows the 15 most popular first, most popular on top", () => {
    render(<Harness />)

    expect(screen.getByRole("region", { name: "Rychlý výběr" })).toBeInTheDocument()
    const names = tagNames()
    expect(names).toHaveLength(POPULAR_FIRST)
    expect(names.slice(0, 3)).toEqual(["Oblíbená 1", "Oblíbená 2", "Oblíbená 3"])
    expect(names.at(-1)).toBe("Oblíbená 15")
  })

  it("loads 20 more at a time until every activity is shown, then hides the button", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const loadMore = (count: number) =>
      user.click(screen.getByRole("button", { name: `Načíst další (${count})` }))

    await loadMore(POPULAR_MORE)
    expect(tagNames()).toHaveLength(POPULAR_FIRST + POPULAR_MORE)
    expect(tagNames().at(-1)).toBe("Oblíbená 35")

    await loadMore(POPULAR_MORE)
    // After the ranked ones: by category order, then name.
    expect(tagNames().slice(40, 47)).toEqual([
      "Oblíbená 41",
      "Oblíbená 42",
      "Oblíbená 43",
      "Oblíbená 44",
      "Oblíbená 45",
      "Míčová 0",
      "Míčová 1",
    ])

    await loadMore(15)
    expect(tagNames()).toHaveLength(ACTIVITIES.length)
    expect(tagNames().at(-1)).toBe("Jiná 19")
    expect(screen.queryByRole("button", { name: /Načíst další/ })).not.toBeInTheDocument()
  })

  it("puts an activity chosen in the search on top when it has no tag on show", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole("button", { name: "Vybrat Jiná 05" }))
    expect(tagNames()).toHaveLength(POPULAR_FIRST + 1)
    const pinned = screen.getByRole("button", { name: "Jiná 05" })
    expect(tagNames()[0]).toBe("Jiná 05")
    expect(pinned).toHaveAttribute("aria-pressed", "true")

    // Taken back with its tag, it stays on top so it can be chosen again.
    await user.click(pinned)
    expect(tagNames()[0]).toBe("Jiná 05")
    expect(pinned).toHaveAttribute("aria-pressed", "false")
  })

  it("leaves an activity chosen in the search where it is when its tag is on show", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole("button", { name: "Vybrat Oblíbená 3" }))

    expect(tagNames().slice(0, 3)).toEqual(["Oblíbená 1", "Oblíbená 2", "Oblíbená 3"])
    expect(screen.getByRole("button", { name: "Oblíbená 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("does not show a pinned tag twice when its batch is loaded", async () => {
    const user = userEvent.setup()
    render(<Harness initial={["ranked-20"]} />)

    await user.click(screen.getByRole("button", { name: `Načíst další (${POPULAR_MORE})` }))

    const names = tagNames()
    expect(names[0]).toBe("Oblíbená 20")
    expect(names.filter((name) => name === "Oblíbená 20")).toHaveLength(1)
    // Still 20 new tags: the batch reaches one further.
    expect(names).toHaveLength(1 + POPULAR_FIRST + POPULAR_MORE)
    expect(names.at(-1)).toBe("Oblíbená 36")
  })

  it("starts with earlier choices that have no tag on show on top", () => {
    render(<Harness initial={["other-5", "ranked-40"]} />)

    expect(tagNames().slice(0, 3)).toEqual(["Oblíbená 40", "Jiná 05", "Oblíbená 1"])
  })

  it("chooses and unchooses an activity with its tag", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const tag = screen.getByRole("button", { name: "Oblíbená 2" })
    await user.click(tag)
    expect(tag).toHaveAttribute("aria-pressed", "true")

    await user.click(tag)
    expect(tag).toHaveAttribute("aria-pressed", "false")
    expect(tagNames()).toHaveLength(POPULAR_FIRST)
  })
})

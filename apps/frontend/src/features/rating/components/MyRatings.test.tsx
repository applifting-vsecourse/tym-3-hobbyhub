import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { GivenRating, ReceivedRating } from "@/features/rating/api/ratingSchemas"
import {
  GivenRatings,
  MyRatingsTabs,
  ReceivedRatings,
  type RatingsList,
} from "@/features/rating/components/MyRatings"

const list = <T,>(items: T[], overrides: Partial<RatingsList<T>> = {}): RatingsList<T> => ({
  items,
  isLoading: false,
  error: null,
  hasMore: false,
  isLoadingMore: false,
  onLoadMore: vi.fn(),
  onRetry: vi.fn(),
  ...overrides,
})

const received = (overrides: Partial<ReceivedRating> = {}): ReceivedRating => ({
  id: "r1",
  direction: "TO_ORGANIZER",
  stars: 5,
  comment: "Skvělá organizace.",
  createdAt: new Date("2030-01-05T10:00:00Z"),
  event: { id: "e1", title: "Badminton" },
  author: { id: "u1", name: "Petra" },
  ...overrides,
})

const given = (overrides: Partial<GivenRating> = {}): GivenRating => ({
  id: "g1",
  direction: "TO_ORGANIZER",
  stars: 4,
  comment: "Kurt byl zamluvený včas.",
  createdAt: new Date("2030-01-05T10:00:00Z"),
  event: { id: "e2", title: "Florbal" },
  ratedUser: { id: "o", name: "Tomáš" },
  isRevealed: false,
  ...overrides,
})

const summary = (count: number, average: number | null) => ({
  score: { count, average },
  distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: count - 1 },
})

describe("MyRatingsTabs", () => {
  it("keeps the part in the URL and marks the one on screen", async () => {
    await renderWithRouter(<MyRatingsTabs active="participant" />)

    const tabs = within(screen.getByRole("navigation", { name: "Části přehledu hodnocení" }))
    expect(tabs.getByRole("link", { name: "Jako organizátor" })).toHaveAttribute(
      "href",
      "/profile/ratings",
    )
    expect(tabs.getByRole("link", { name: "Jako účastník" })).toHaveAttribute(
      "href",
      "/profile/ratings?tab=participant",
    )
    expect(tabs.getByRole("link", { name: "Jako účastník" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(tabs.getByRole("link", { name: "Odeslaná" })).toHaveAttribute(
      "href",
      "/profile/ratings?tab=given",
    )
  })
})

describe("ReceivedRatings", () => {
  it("shows the score, how the stars fell and each rating with its author", async () => {
    await renderWithRouter(
      <ReceivedRatings
        ratedAs="asOrganizer"
        list={list([received(), received({ id: "r2", stars: 4, comment: null })])}
        summary={summary(4, 4.75)}
      />,
    )

    expect(screen.getByRole("img", { name: "Hodnocení 4,8 z 5, 4 hodnocení" })).toBeInTheDocument()
    // Five stars came up three times, four stars once.
    const fiveStars = screen.getByText("5 hvězdiček z 5", { selector: "dt span" }).closest("div")!
    expect(within(fiveStars).getByText("3")).toBeInTheDocument()

    expect(screen.getAllByRole("link", { name: "Petra" })[0]).toHaveAttribute("href", "/profile/u1")
    expect(screen.getAllByRole("link", { name: "Badminton" })[0]).toHaveAttribute(
      "href",
      "/events/e1",
    )
    expect(screen.getByText("Skvělá organizace.")).toBeInTheDocument()
    expect(screen.getAllByText(/5\. 1\. 2030/)).toHaveLength(2)
  })

  it("tells the owner when others do not see the score yet", async () => {
    await renderWithRouter(
      <ReceivedRatings
        ratedAs="asParticipant"
        list={list([received({ direction: "TO_PARTICIPANT" })])}
        summary={summary(1, 5)}
      />,
    )

    expect(screen.getByText("Máš 1 hodnocení, ostatním se ukáže od 3.")).toBeInTheDocument()
  })

  it("names an author whose account is gone as a deleted user", async () => {
    await renderWithRouter(
      <ReceivedRatings
        ratedAs="asOrganizer"
        list={list([received({ author: null })])}
        summary={summary(3, 5)}
      />,
    )

    expect(screen.getByText("Smazaný uživatel")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Petra" })).not.toBeInTheDocument()
  })

  // ADR-0027: ratings of an event whose period is on are not here, and nothing
  // hints that some are waiting.
  it("says there is nothing yet, without a score or a count", async () => {
    await renderWithRouter(
      <ReceivedRatings
        ratedAs="asParticipant"
        list={list([])}
        summary={{
          score: { count: 0, average: null },
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        }}
      />,
    )

    expect(screen.getByText("Jako účastník tu zatím žádné hodnocení nemáš.")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.queryByText("Zatím málo hodnocení")).not.toBeInTheDocument()
    expect(screen.queryByText("Kolikrát padla která známka")).not.toBeInTheDocument()
  })

  it("offers to retry a failed load", async () => {
    const onRetry = vi.fn()
    await renderWithRouter(
      <ReceivedRatings
        ratedAs="asOrganizer"
        list={list([], { error: new Error("boom"), onRetry })}
        summary={null}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Hodnocení se nepodařilo načíst")
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("loads the next page on request", async () => {
    const onLoadMore = vi.fn()
    await renderWithRouter(
      <ReceivedRatings
        ratedAs="asOrganizer"
        list={list([received()], { hasMore: true, onLoadMore })}
        summary={summary(25, 4.5)}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Načíst další" }))
    expect(onLoadMore).toHaveBeenCalledOnce()
  })
})

describe("GivenRatings", () => {
  it("shows whom the person rated, for which event, and whether they see it yet", async () => {
    await renderWithRouter(
      <GivenRatings
        list={list([
          given(),
          given({
            id: "g2",
            direction: "TO_PARTICIPANT",
            ratedUser: { id: "p", name: "Ondra" },
            comment: null,
            isRevealed: true,
          }),
        ])}
      />,
    )

    const [toOrganizer, toParticipant] = screen.getAllByRole("listitem") as [
      HTMLElement,
      HTMLElement,
    ]
    expect(within(toOrganizer).getByRole("link", { name: "Tomáš" })).toHaveAttribute(
      "href",
      "/profile/o",
    )
    expect(within(toOrganizer).getByText(/Hodnocení organizátora/)).toBeInTheDocument()
    expect(within(toOrganizer).getByText("4 hvězdičky z 5")).toBeInTheDocument()
    expect(within(toOrganizer).getByText("Kurt byl zamluvený včas.")).toBeInTheDocument()
    expect(within(toOrganizer).getByText("Odkryje se po konci lhůty")).toBeInTheDocument()

    expect(within(toParticipant).getByText(/Hodnocení účastníka/)).toBeInTheDocument()
    expect(within(toParticipant).getByText("Odkryté")).toBeInTheDocument()
  })

  it("says there is nothing sent yet", async () => {
    await renderWithRouter(<GivenRatings list={list([])} />)

    expect(screen.getByText("Zatím tu není žádné odeslané hodnocení.")).toBeInTheDocument()
  })
})

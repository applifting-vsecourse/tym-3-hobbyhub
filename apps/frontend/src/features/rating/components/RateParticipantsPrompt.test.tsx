import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventRatingState, RatingTarget } from "@/features/rating/api/ratingSchemas"
import { RateParticipantsPrompt } from "@/features/rating/components/RateParticipantsPrompt"

const rated: Partial<RatingTarget> = {
  rating: {
    id: "r1",
    eventId: "e1",
    direction: "TO_PARTICIPANT",
    ratedUserId: "u1",
    stars: 4,
    comment: null,
    createdAt: new Date(),
  },
  violations: ["ALREADY_RATED"],
}

const aParticipant = (id: string, overrides: Partial<RatingTarget> = {}): RatingTarget => ({
  user: { id, name: id },
  rating: null,
  violations: [],
  ...overrides,
})

const aState = (participants: RatingTarget[]): EventRatingState => ({
  event: { id: "e1", title: "Badminton" },
  deadline: new Date("2030-01-09T19:00:00Z"),
  organizer: null,
  participants,
})

describe("RateParticipantsPrompt (#235)", () => {
  it("leads the organizer to the rating, with until when and how many are left", async () => {
    await renderWithRouter(
      <RateParticipantsPrompt
        state={aState([aParticipant("a", rated), aParticipant("b"), aParticipant("c")])}
      />,
    )

    expect(
      screen.getByText(/Účastníky můžeš ohodnotit do 9\. ledna 2030.*Zbývají 2 z 3\./),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ohodnotit účastníky" })).toHaveAttribute(
      "href",
      "/events/e1/ratings",
    )
  })

  it("says the participants are rated once all are, with the way to what was sent", async () => {
    await renderWithRouter(<RateParticipantsPrompt state={aState([aParticipant("a", rated)])} />)

    expect(screen.getByText(/Účastníky máš ohodnocené\./)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Zobrazit hodnocení" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Ohodnotit účastníky" })).toBeNull()
  })

  it("shows nothing once the period is over, or with nobody to rate", async () => {
    const { container, unmount } = await renderWithRouter(
      <RateParticipantsPrompt
        state={aState([
          aParticipant("a", { ...rated, violations: ["ALREADY_RATED", "RATING_CLOSED"] }),
          aParticipant("b", { violations: ["RATING_CLOSED"] }),
        ])}
      />,
    )
    expect(container).toBeEmptyDOMElement()
    unmount()

    const empty = await renderWithRouter(<RateParticipantsPrompt state={aState([])} />)
    expect(empty.container).toBeEmptyDOMElement()
  })
})

import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventRatingState, RatingTarget } from "@/features/rating/api/ratingSchemas"
import { RateOrganizerPrompt } from "@/features/rating/components/RateOrganizerPrompt"

const anOrganizer = (overrides: Partial<RatingTarget> = {}): RatingTarget => ({
  user: { id: "o", name: "Tomáš" },
  rating: null,
  violations: [],
  ...overrides,
})

const aState = (organizer: RatingTarget | null): EventRatingState => ({
  event: { id: "e1", title: "Badminton" },
  deadline: new Date("2030-01-09T19:00:00Z"),
  organizer,
  participants: [],
})

describe("RateOrganizerPrompt", () => {
  it("leads a participant to the rating and says until when", async () => {
    await renderWithRouter(<RateOrganizerPrompt state={aState(anOrganizer())} />)

    expect(screen.getByText(/Organizátora můžeš ohodnotit do 9\. ledna 2030/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ohodnotit organizátora" })).toHaveAttribute(
      "href",
      "/events/e1/ratings",
    )
  })

  it("says the organizer is rated instead, with the way to what was sent", async () => {
    await renderWithRouter(
      <RateOrganizerPrompt
        state={aState(
          anOrganizer({
            rating: {
              id: "r1",
              eventId: "e1",
              direction: "TO_ORGANIZER",
              ratedUserId: "o",
              stars: 5,
              comment: null,
              createdAt: new Date(),
            },
            violations: ["ALREADY_RATED"],
          }),
        )}
      />,
    )

    expect(screen.getByText(/Organizátora už máš ohodnoceného/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Zobrazit hodnocení" })).toHaveAttribute(
      "href",
      "/events/e1/ratings",
    )
    expect(screen.queryByRole("link", { name: "Ohodnotit organizátora" })).not.toBeInTheDocument()
  })

  it.each([
    ["the rating period is over", aState(anOrganizer({ violations: ["RATING_CLOSED"] }))],
    ["the event was cancelled", aState(anOrganizer({ violations: ["EVENT_CANCELLED"] }))],
    ["the person runs the event", aState(null)],
  ])("shows nothing when %s", async (_why, state) => {
    await renderWithRouter(<RateOrganizerPrompt state={state} />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByText(/ohodnotit/i)).not.toBeInTheDocument()
  })
})

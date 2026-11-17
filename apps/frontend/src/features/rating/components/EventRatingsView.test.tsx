import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventRatingState, RatingTarget } from "@/features/rating/api/ratingSchemas"
import { EventRatingsView } from "@/features/rating/components/EventRatingsView"

const aTarget = (overrides: Partial<RatingTarget> = {}): RatingTarget => ({
  user: { id: "u1", name: "Petra" },
  rating: null,
  violations: [],
  ...overrides,
})

const aState = (overrides: Partial<EventRatingState> = {}): EventRatingState => ({
  event: { id: "e1", title: "Badminton" },
  deadline: new Date("2030-01-09T19:00:00Z"),
  organizer: null,
  participants: [],
  ...overrides,
})

describe("EventRatingsView", () => {
  it("shows a participant the organizer, until when, and that the form is coming", async () => {
    await renderWithRouter(
      <EventRatingsView
        state={aState({ organizer: aTarget({ user: { id: "o", name: "Tomáš" } }) })}
      />,
    )

    expect(screen.getByRole("heading", { level: 1, name: "Badminton" })).toBeInTheDocument()
    expect(screen.getByText(/Hodnotit můžeš do 9\. ledna 2030/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Organizátor" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tomáš" })).toBeInTheDocument()
    expect(screen.getByText("Zatím neohodnoceno")).toBeInTheDocument()
    expect(screen.getByText("Formulář pro zadání hodnocení brzy přibude.")).toBeInTheDocument()
  })

  it("shows the organizer the participants and what they gave", async () => {
    await renderWithRouter(
      <EventRatingsView
        state={aState({
          participants: [
            aTarget({
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
            }),
            aTarget({ user: { id: "u2", name: "Ondra" } }),
          ],
        })}
      />,
    )

    expect(screen.getByRole("heading", { name: "Účastníci" })).toBeInTheDocument()
    expect(screen.getByText("4 hvězdičky z 5")).toBeInTheDocument()
    expect(screen.getAllByText("Zatím neohodnoceno")).toHaveLength(1)
  })

  it("says when the period is over", async () => {
    await renderWithRouter(
      <EventRatingsView
        state={aState({ organizer: aTarget({ violations: ["RATING_CLOSED"] }) })}
      />,
    )

    expect(screen.getByText(/Hodnocení skončilo/)).toBeInTheDocument()
    expect(
      screen.queryByText("Formulář pro zadání hodnocení brzy přibude."),
    ).not.toBeInTheDocument()
  })

  it("says so when there is nobody to rate", async () => {
    await renderWithRouter(<EventRatingsView state={aState()} />)

    expect(screen.getByText("Na této akci nemáš koho hodnotit.")).toBeInTheDocument()
  })
})

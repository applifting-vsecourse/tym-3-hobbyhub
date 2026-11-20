import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventRatingState, Rating, RatingTarget } from "@/features/rating/api/ratingSchemas"
import { EventRatingsView } from "@/features/rating/components/EventRatingsView"

const aTarget = (overrides: Partial<RatingTarget> = {}): RatingTarget => ({
  user: { id: "u1", name: "Petra" },
  rating: null,
  violations: [],
  ...overrides,
})

const aRating = (overrides: Partial<Rating> = {}): Rating => ({
  id: "r1",
  eventId: "e1",
  direction: "TO_ORGANIZER",
  ratedUserId: "o",
  stars: 4,
  comment: null,
  createdAt: new Date(),
  ...overrides,
})

const aState = (overrides: Partial<EventRatingState> = {}): EventRatingState => ({
  event: { id: "e1", title: "Badminton" },
  deadline: new Date("2030-01-09T19:00:00Z"),
  organizer: null,
  participants: [],
  ...overrides,
})

const anOrganizer = (overrides: Partial<RatingTarget> = {}) =>
  aTarget({ user: { id: "o", name: "Tomáš" }, ...overrides })

const noRating = () => Promise.resolve()

/** The page of a participant who may rate the organizer now. */
const renderForm = async (
  props: Partial<Parameters<typeof EventRatingsView>[0]> = {},
  onRateOrganizer = vi.fn(noRating),
) => {
  const rendered = await renderWithRouter(
    <EventRatingsView
      state={aState({ organizer: anOrganizer() })}
      onRateOrganizer={onRateOrganizer}
      {...props}
    />,
  )
  return { ...rendered, onRateOrganizer, user: userEvent.setup() }
}

describe("EventRatingsView", () => {
  it("shows a participant the organizer, until when, and the form to rate them", async () => {
    await renderForm()

    expect(screen.getByRole("heading", { level: 1, name: "Badminton" })).toBeInTheDocument()
    expect(screen.getByText(/Hodnotit můžeš do 9\. ledna 2030/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Organizátor" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tomáš" })).toBeInTheDocument()
    expect(screen.getByText("Zatím neohodnoceno")).toBeInTheDocument()
    expect(
      screen.getByRole("radiogroup", { name: "Jak hodnotíš organizátora?" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Komentář (nepovinný)")).toBeInTheDocument()
    // A sent rating is final: the form says so before it is sent.
    expect(screen.getByText("Odeslané hodnocení už nepůjde změnit ani smazat.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Odeslat hodnocení" })).toBeEnabled()
  })

  it("sends the stars with the comment, trimmed", async () => {
    const { user, onRateOrganizer } = await renderForm()

    await user.click(screen.getByRole("radio", { name: "4 hvězdičky z 5" }))
    await user.type(screen.getByLabelText("Komentář (nepovinný)"), "  Kurt byl zamluvený včas. ")
    await user.click(screen.getByRole("button", { name: "Odeslat hodnocení" }))

    expect(onRateOrganizer).toHaveBeenCalledWith({
      stars: 4,
      comment: "Kurt byl zamluvený včas.",
    })
  })

  it("sends the stars alone: the comment is optional", async () => {
    const { user, onRateOrganizer } = await renderForm()

    await user.click(screen.getByRole("radio", { name: "5 hvězdiček z 5" }))
    await user.click(screen.getByRole("button", { name: "Odeslat hodnocení" }))

    expect(onRateOrganizer).toHaveBeenCalledWith({ stars: 5, comment: undefined })
  })

  it("does not send without stars and says why", async () => {
    const { user, onRateOrganizer } = await renderForm()

    await user.type(screen.getByLabelText("Komentář (nepovinný)"), "Fajn")
    await user.click(screen.getByRole("button", { name: "Odeslat hodnocení" }))

    expect(await screen.findByText("Vyber 1 až 5 hvězdiček.")).toBeInTheDocument()
    expect(onRateOrganizer).not.toHaveBeenCalled()
  })

  it("counts the characters left and refuses a comment over the limit", async () => {
    const { user, onRateOrganizer } = await renderForm()

    expect(screen.getByText("Zbývá 500 znaků")).toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: "3 hvězdičky z 5" }))
    // Pasted, not typed: 502 key presses would only slow the test down.
    await user.click(screen.getByLabelText("Komentář (nepovinný)"))
    await user.paste("a".repeat(502))

    expect(screen.getByText("O 2 znaky víc, než se vejde")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Odeslat hodnocení" }))

    expect(await screen.findByText("Komentář může mít nejvýš 500 znaků.")).toBeInTheDocument()
    expect(onRateOrganizer).not.toHaveBeenCalled()
  })

  it("keeps what was filled in when sending fails, and says so", async () => {
    const { user } = await renderForm(
      { organizerRatingError: "Hodnocení se nepodařilo odeslat. Zkus to znovu." },
      vi.fn(() => Promise.reject(new Error("offline"))),
    )

    await user.click(screen.getByRole("radio", { name: "2 hvězdičky z 5" }))
    await user.type(screen.getByLabelText("Komentář (nepovinný)"), "Pozdě")
    await user.click(screen.getByRole("button", { name: "Odeslat hodnocení" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Hodnocení se nepodařilo odeslat.")
    expect(screen.getByRole("radio", { name: "2 hvězdičky z 5" })).toBeChecked()
    expect(screen.getByLabelText("Komentář (nepovinný)")).toHaveValue("Pozdě")
  })

  it("disables the form while the rating is being sent", async () => {
    await renderForm({ isRatingOrganizer: true })

    expect(screen.getByRole("button", { name: "Odesílám…" })).toBeDisabled()
    expect(screen.getByLabelText("Komentář (nepovinný)")).toBeDisabled()
  })

  it("asks before leaving a rating that was started", async () => {
    const { user, navigateAway } = await renderForm()

    await user.click(screen.getByRole("radio", { name: "4 hvězdičky z 5" }))
    navigateAway()

    expect(await screen.findByRole("dialog", { name: "Opustit stránku?" })).toBeInTheDocument()
  })

  it("shows the sent rating instead of the form: it is final", async () => {
    await renderWithRouter(
      <EventRatingsView
        onRateOrganizer={noRating}
        state={aState({
          organizer: anOrganizer({
            rating: aRating({ stars: 4, comment: "Kurt byl zamluvený včas." }),
            violations: ["ALREADY_RATED"],
          }),
        })}
      />,
    )

    expect(screen.getByText("4 hvězdičky z 5")).toBeInTheDocument()
    expect(screen.getByText("Tvůj komentář")).toBeInTheDocument()
    expect(screen.getByText("Kurt byl zamluvený včas.")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Organizátor ho uvidí až po konci lhůty.")
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Odeslat hodnocení" })).not.toBeInTheDocument()
  })

  it("still says why a rating was refused once the form is gone", async () => {
    await renderWithRouter(
      <EventRatingsView
        onRateOrganizer={noRating}
        organizerRatingError="Lhůta na hodnocení už vypršela."
        state={aState({ organizer: anOrganizer({ violations: ["RATING_CLOSED"] }) })}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Lhůta na hodnocení už vypršela.")
    expect(screen.getByText(/Hodnocení skončilo/)).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
  })

  it("shows the organizer the participants, what they gave, and that their form is coming", async () => {
    await renderWithRouter(
      <EventRatingsView
        onRateOrganizer={noRating}
        state={aState({
          participants: [
            aTarget({
              rating: aRating({ direction: "TO_PARTICIPANT", ratedUserId: "u1" }),
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
    expect(screen.getByText("Formulář pro hodnocení účastníků brzy přibude.")).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
  })

  it("says when the period is over, without a form", async () => {
    await renderWithRouter(
      <EventRatingsView
        onRateOrganizer={noRating}
        state={aState({ organizer: anOrganizer({ violations: ["RATING_CLOSED"] }) })}
      />,
    )

    expect(screen.getByText(/Hodnocení skončilo/)).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("says so when there is nobody to rate", async () => {
    await renderWithRouter(
      <EventRatingsView
        state={aState()}
        onRateOrganizer={noRating}
      />,
    )

    expect(screen.getByText("Na této akci nemáš koho hodnotit.")).toBeInTheDocument()
  })
})

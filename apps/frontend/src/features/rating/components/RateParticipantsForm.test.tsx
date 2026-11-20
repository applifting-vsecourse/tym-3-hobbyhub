import { useState } from "react"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type {
  EventRatingState,
  Rating,
  RatingInput,
  RatingTarget,
} from "@/features/rating/api/ratingSchemas"
import { RatingRefusedError } from "@/features/rating/api/submitRating"
import { EventRatingsView } from "@/features/rating/components/EventRatingsView"

const aParticipant = (id: string, name: string, overrides: Partial<RatingTarget> = {}) => ({
  user: { id, name },
  rating: null,
  violations: [],
  ...overrides,
})

const aRating = (overrides: Partial<Rating> = {}): Rating => ({
  id: "r1",
  eventId: "e1",
  direction: "TO_PARTICIPANT",
  ratedUserId: "u1",
  stars: 4,
  comment: null,
  createdAt: new Date(),
  ...overrides,
})

const aState = (participants: RatingTarget[]): EventRatingState => ({
  event: { id: "e1", title: "Badminton" },
  deadline: new Date("2030-01-09T19:00:00Z"),
  organizer: null,
  participants,
})

type Send = (participantId: string, input: RatingInput) => Promise<void>

/**
 * The organizer's ratings page with a stand-in for the server: what `send`
 * accepts becomes a sent rating on the next read, as after a refetch.
 */
const renderList = async (participants: RatingTarget[], send: Send = () => Promise.resolve()) => {
  const onRate = vi.fn(send)

  function Page() {
    const [targets, setTargets] = useState(participants)
    const [saved] = useState(() => new Map<string, RatingInput>())
    return (
      <EventRatingsView
        state={aState(targets)}
        onRateOrganizer={() => Promise.resolve()}
        onRateParticipant={async (participantId, input) => {
          await onRate(participantId, input)
          saved.set(participantId, input)
        }}
        onParticipantsRated={() => {
          setTargets((current) =>
            current.map((target) => {
              const input = saved.get(target.user.id)
              return input
                ? {
                    ...target,
                    rating: aRating({ stars: input.stars, comment: input.comment ?? null }),
                    violations: ["ALREADY_RATED"],
                  }
                : target
            }),
          )
          return Promise.resolve()
        }}
      />
    )
  }

  const rendered = await renderWithRouter(<Page />)
  return { ...rendered, onRate, user: userEvent.setup() }
}

const three = () => [
  aParticipant("u1", "Petra"),
  aParticipant("u2", "Ondra"),
  aParticipant("u3", "Jana"),
]

const starsOf = (name: string) => screen.getByRole("radiogroup", { name: `Hodnocení účastníka ${name}` })

const pick = async (user: ReturnType<typeof userEvent.setup>, name: string, stars: string) => {
  await user.click(within(starsOf(name)).getByRole("radio", { name: stars }))
}

const reviewButton = () => screen.getByRole("button", { name: /Zkontrolovat a odeslat/ })

describe("RateParticipantsForm (#235)", () => {
  it("lists everyone with stars and keeps the progress in sight", async () => {
    await renderList([
      aParticipant("u1", "Petra", { rating: aRating({ stars: 3 }), violations: ["ALREADY_RATED"] }),
      aParticipant("u2", "Ondra"),
      aParticipant("u3", "Jana"),
    ])

    expect(screen.getByRole("heading", { name: "Účastníci" })).toBeInTheDocument()
    expect(screen.getByText(/Ohodnoceno 1 z 3/)).toBeInTheDocument()
    expect(screen.getByText(/hodnotit můžeš do 9\. ledna 2030/)).toBeInTheDocument()
    // The one already rated is only shown.
    expect(screen.getByText("3 hvězdičky z 5")).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup", { name: "Hodnocení účastníka Petra" })).toBeNull()
    expect(starsOf("Ondra")).toBeInTheDocument()
    expect(starsOf("Jana")).toBeInTheDocument()
    expect(reviewButton()).toHaveTextContent("Zkontrolovat a odeslat (0)")
  })

  it("only drafts on a tap: nothing is sent and the stars can change", async () => {
    const { user, onRate } = await renderList(three())

    await pick(user, "Petra", "3 hvězdičky z 5")
    await pick(user, "Petra", "4 hvězdičky z 5")

    expect(within(starsOf("Petra")).getByRole("radio", { name: "4 hvězdičky z 5" })).toBeChecked()
    expect(reviewButton()).toHaveTextContent("(1)")
    expect(onRate).not.toHaveBeenCalled()
    // The warning that a rating is final belongs to the review alone.
    expect(screen.queryByText(/nepůjde změnit ani smazat/)).toBeNull()
  })

  it("asks for a reason at one or two stars, still optionally", async () => {
    const { user } = await renderList(three())

    expect(screen.queryByLabelText("Komentář (nepovinný)")).toBeNull()
    await pick(user, "Ondra", "2 hvězdičky z 5")

    expect(screen.getByLabelText("Komentář (nepovinný)")).toHaveAttribute(
      "placeholder",
      "Napiš proč, pomůže to dalším organizátorům…",
    )
  })

  it("opens a comment on request", async () => {
    const { user } = await renderList(three())

    await user.click(screen.getByRole("button", { name: "Komentář Jana" }))

    expect(screen.getByLabelText("Komentář (nepovinný)")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Komentář Jana" })).toBeNull()
  })

  it("says what is wrong when there is nothing to send", async () => {
    const { user } = await renderList(three())

    await user.click(reviewButton())

    expect(screen.getByRole("alert")).toHaveTextContent("Vyber hvězdičky aspoň u jednoho účastníka.")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("refuses a comment without stars instead of losing it", async () => {
    const { user } = await renderList(three())

    await user.click(screen.getByRole("button", { name: "Komentář Petra" }))
    await user.type(screen.getByLabelText("Komentář (nepovinný)"), "Skvělá hra")
    await user.click(reviewButton())

    expect(
      screen.getByText("Bez hvězdiček se komentář neodešle. Vyber hvězdičky, nebo komentář smaž."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("reviews before sending: the usual stars grouped, the rest one by one, lowest first", async () => {
    const participants = [
      aParticipant("u1", "Petra"),
      aParticipant("u2", "Ondra"),
      aParticipant("u3", "Jana"),
      aParticipant("u4", "Karel"),
      aParticipant("u5", "Eva"),
    ]
    const { user, onRate } = await renderList(participants)

    await pick(user, "Petra", "5 hvězdiček z 5")
    await pick(user, "Ondra", "5 hvězdiček z 5")
    await pick(user, "Jana", "4 hvězdičky z 5")
    await pick(user, "Karel", "2 hvězdičky z 5")
    await user.type(screen.getByLabelText("Komentář (nepovinný)"), "Přišel pozdě")
    await user.click(reviewButton())

    const review = await screen.findByRole("dialog", { name: "Zkontrolovat hodnocení" })
    expect(review).toHaveTextContent(
      "Odeslaná hodnocení už nepůjde změnit ani smazat. Účastníci je uvidí po 9. ledna 2030",
    )
    expect(within(review).getByText("2×")).toBeInTheDocument()
    expect(within(review).getByText("Petra a Ondra")).toBeInTheDocument()
    const singles = within(review).getAllByRole("listitem")
    expect(singles.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Karel"),
      expect.stringContaining("Jana"),
    ])
    expect(singles[0]).toHaveTextContent("Přišel pozdě")
    expect(review).toHaveTextContent("1 účastník zůstane neohodnocený")
    expect(onRate).not.toHaveBeenCalled()
  })

  it("sends only what has stars, with the comment trimmed, and leaves the rest for later", async () => {
    const { user, onRate } = await renderList(three())

    await pick(user, "Petra", "2 hvězdičky z 5")
    await user.type(screen.getByLabelText("Komentář (nepovinný)"), "  Přišla pozdě  ")
    await pick(user, "Jana", "5 hvězdiček z 5")
    await user.click(reviewButton())
    await user.click(await screen.findByRole("button", { name: "Odeslat 2 hodnocení" }))

    expect(onRate).toHaveBeenCalledTimes(2)
    expect(onRate).toHaveBeenCalledWith("u1", { stars: 2, comment: "Přišla pozdě" })
    expect(onRate).toHaveBeenCalledWith("u3", { stars: 5, comment: undefined })
    // Sent ones are only shown now; Ondra is still to rate.
    expect(await screen.findByText(/Ohodnoceno 2 z 3/)).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup", { name: "Hodnocení účastníka Petra" })).toBeNull()
    expect(screen.getByText("Přišla pozdě")).toBeInTheDocument()
    expect(starsOf("Ondra")).toBeInTheDocument()
    expect(reviewButton()).toHaveTextContent("(0)")
  })

  it("says per row what was not saved, and retries just that one", async () => {
    let isOffline = true
    const { user, onRate } = await renderList(three(), (participantId) => {
      if (participantId === "u2" && isOffline) return Promise.reject(new Error("offline"))
      if (participantId === "u3") return Promise.reject(new RatingRefusedError(["NO_SEAT"]))
      return Promise.resolve()
    })

    await pick(user, "Petra", "4 hvězdičky z 5")
    await pick(user, "Ondra", "3 hvězdičky z 5")
    await pick(user, "Jana", "5 hvězdiček z 5")
    await user.click(reviewButton())
    await user.click(await screen.findByRole("button", { name: "Odeslat 3 hodnocení" }))

    const alerts = await screen.findAllByRole("alert")
    expect(alerts.map((alert) => alert.textContent)).toEqual([
      expect.stringContaining("Hodnocení se nepodařilo odeslat."),
      expect.stringContaining("Hodnotit může jen ten, kdo měl na akci schválené místo."),
    ])
    // What failed keeps its stars; what went through is only shown.
    expect(within(starsOf("Ondra")).getByRole("radio", { name: "3 hvězdičky z 5" })).toBeChecked()
    expect(screen.queryByRole("radiogroup", { name: "Hodnocení účastníka Petra" })).toBeNull()

    isOffline = false
    onRate.mockClear()
    const [offlineAlert] = alerts
    if (!offlineAlert) throw new Error("No alert for the failed rating")
    await user.click(within(offlineAlert).getByRole("button", { name: "Zkusit znovu" }))

    expect(onRate).toHaveBeenCalledTimes(1)
    expect(onRate).toHaveBeenCalledWith("u2", { stars: 3, comment: undefined })
    expect(await screen.findByText(/Ohodnoceno 2 z 3/)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
  })

  it("prefills five stars for the rest without touching what was chosen, and undoes only that", async () => {
    const { user, onRate } = await renderList(three())

    await pick(user, "Ondra", "3 hvězdičky z 5")
    await user.click(screen.getByRole("button", { name: "Předvyplnit zbývajícím 5★" }))

    expect(within(starsOf("Petra")).getByRole("radio", { name: "5 hvězdiček z 5" })).toBeChecked()
    expect(within(starsOf("Jana")).getByRole("radio", { name: "5 hvězdiček z 5" })).toBeChecked()
    expect(within(starsOf("Ondra")).getByRole("radio", { name: "3 hvězdičky z 5" })).toBeChecked()
    expect(screen.getAllByText("Předvyplněno")).toHaveLength(2)
    expect(reviewButton()).toHaveTextContent("(3)")
    expect(onRate).not.toHaveBeenCalled()

    // A prefilled row changed by hand is the organizer's own.
    await pick(user, "Jana", "4 hvězdičky z 5")
    await user.click(screen.getByRole("button", { name: "Zrušit předvyplnění" }))

    expect(within(starsOf("Petra")).getByRole("radio", { name: "5 hvězdiček z 5" })).not.toBeChecked()
    expect(within(starsOf("Jana")).getByRole("radio", { name: "4 hvězdičky z 5" })).toBeChecked()
    expect(within(starsOf("Ondra")).getByRole("radio", { name: "3 hvězdičky z 5" })).toBeChecked()
    expect(screen.queryByText("Předvyplněno")).toBeNull()
    expect(screen.getByRole("button", { name: "Předvyplnit zbývajícím 5★" })).toBeInTheDocument()
  })

  it("offers no prefill when everyone left has stars", async () => {
    const { user } = await renderList([aParticipant("u1", "Petra")])

    await pick(user, "Petra", "4 hvězdičky z 5")

    expect(screen.queryByRole("button", { name: "Předvyplnit zbývajícím 5★" })).toBeNull()
  })

  it("asks before leaving with drafts that were not sent", async () => {
    const { user, navigateAway } = await renderList(three())

    await pick(user, "Ondra", "4 hvězdičky z 5")
    navigateAway()

    expect(await screen.findByRole("dialog", { name: "Opustit stránku?" })).toBeInTheDocument()
  })

  it("says it is done once everyone is rated, and when they will see it", async () => {
    const { user } = await renderList([aParticipant("u1", "Petra")])

    await pick(user, "Petra", "5 hvězdiček z 5")
    await user.click(reviewButton())
    await user.click(await screen.findByRole("button", { name: "Odeslat 1 hodnocení" }))

    expect(
      await screen.findByText(/Hotovo, všechny účastníky máš ohodnocené\. .* po 9\. ledna 2030/),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Zkontrolovat a odeslat/ })).toBeNull()
    expect(screen.queryByText(/Ohodnoceno/)).toBeNull()
  })

  it("shows only what was given once the period is over", async () => {
    await renderWithRouter(
      <EventRatingsView
        onRateOrganizer={() => Promise.resolve()}
        state={aState([
          aParticipant("u1", "Petra", {
            rating: aRating({ stars: 4 }),
            violations: ["ALREADY_RATED", "RATING_CLOSED"],
          }),
          aParticipant("u2", "Ondra", { violations: ["RATING_CLOSED"] }),
        ])}
      />,
    )

    expect(screen.getByText(/Hodnocení skončilo/)).toBeInTheDocument()
    expect(screen.getByText("4 hvězdičky z 5")).toBeInTheDocument()
    expect(screen.getByText("Zatím neohodnoceno")).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(screen.queryByRole("button", { name: /Zkontrolovat a odeslat/ })).toBeNull()
  })
})

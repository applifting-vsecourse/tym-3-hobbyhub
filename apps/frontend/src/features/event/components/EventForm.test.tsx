import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventForm, type ActivityOption } from "@/features/event/components/EventForm"

const ACTIVITIES: ActivityOption[] = [
  {
    id: "a-volejbal",
    label: "Volejbal",
    icon: "volejbal",
    defaultMinParticipants: 6,
    defaultMaxParticipants: 12,
  },
  {
    id: "a-florbal",
    label: "Florbal",
    icon: "florbal",
    defaultMinParticipants: 8,
    defaultMaxParticipants: 12,
  },
]

// jsdom has no matchMedia; the form picks the phone wizard or the desktop page by it.
const setViewport = (isDesktop: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: isDesktop,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

beforeEach(() => {
  setViewport(false)
  window.scrollTo = vi.fn()
})

const renderForm = async (props: Partial<Parameters<typeof EventForm>[0]> = {}) => {
  const onSubmit = vi.fn()
  await renderWithRouter(
    <EventForm
      activities={ACTIVITIES}
      isActivitiesLoading={false}
      isActivitiesError={false}
      onRetryActivities={vi.fn()}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, user: userEvent.setup() }
}

// Native date and time inputs take their value as a whole, not keystroke by keystroke.
const setValue = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const fillFirstStep = async (
  user: ReturnType<typeof userEvent.setup>,
  { startDate = "2030-01-15", endDate = "2030-01-15" } = {},
) => {
  await user.click(screen.getByRole("combobox", { name: "Aktivita" }))
  await user.click(await screen.findByRole("option", { name: "Florbal" }))
  await user.type(screen.getByLabelText("Název"), "  Čtvrteční florbal ")
  setValue("Datum", startDate)
  setValue("Čas od", "19:00")
  setValue("Datum konce", endDate)
  setValue("Čas do", "20:30")
  await user.type(screen.getByLabelText("Ulice a číslo"), "Chabařovická 4")
  await user.type(screen.getByLabelText("Město"), "Praha 8")
  await user.type(screen.getByLabelText("PSČ"), "182 00")
}

const continueToNextStep = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Pokračovat" }))

const counterButton = (label: string, direction: "více" | "méně") =>
  screen.getByRole("button", { name: `${label}: ${direction}` })

const counterValue = (label: string) =>
  within(screen.getByRole("group", { name: label })).getByRole("status")

describe("EventForm on a phone", () => {
  it("tells which required fields of the first step are missing", async () => {
    const { onSubmit, user } = await renderForm()

    await continueToNextStep(user)

    expect(await screen.findByText("Zadejte název akce")).toBeInTheDocument()
    expect(screen.getByText("Vyberte aktivitu", { selector: "p" })).toBeInTheDocument()
    expect(screen.getAllByText("Zadejte datum")).toHaveLength(2)
    expect(screen.getAllByText("Zadejte čas")).toHaveLength(2)
    expect(screen.getByText("Zadejte ulici a číslo")).toBeInTheDocument()
    expect(screen.getByText("Zadejte město")).toBeInTheDocument()
    expect(screen.getByText("Zadejte PSČ")).toBeInTheDocument()
    expect(screen.getByText("Krok 1 ze 3 · Co a kdy")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("prefills the country", async () => {
    await renderForm()

    expect(screen.getByLabelText("Země")).toHaveValue("Česko")
  })

  it("refuses a start in the past and an end before the start", async () => {
    const { user } = await renderForm()

    await fillFirstStep(user, { startDate: "2020-01-01", endDate: "2019-12-31" })
    await continueToNextStep(user)

    expect(await screen.findByText("Začátek musí být v budoucnu")).toBeInTheDocument()
    expect(screen.getByText("Konec musí být po začátku")).toBeInTheDocument()
    expect(screen.getByText("Krok 1 ze 3 · Co a kdy")).toBeInTheDocument()
  })

  it("follows the start date with the end date until it is set", async () => {
    await renderForm()

    setValue("Datum", "2030-01-15")

    expect(screen.getByLabelText("Datum konce")).toHaveValue("2030-01-15")
  })

  it("starts the counts from the usual size of the chosen activity", async () => {
    const { user } = await renderForm()

    await fillFirstStep(user)
    await continueToNextStep(user)

    expect(await screen.findByText("Krok 2 ze 3 · Kdo a kolik")).toBeInTheDocument()
    expect(counterValue("Minimum")).toHaveTextContent("8")
    expect(counterValue("Maximum")).toHaveTextContent("12")
    expect(screen.getByText("Chybí 8 do minima")).toBeInTheDocument()
  })

  it("keeps the counts consistent with each other", async () => {
    const { user } = await renderForm()
    await fillFirstStep(user)
    await continueToNextStep(user)
    await screen.findByText("Krok 2 ze 3 · Kdo a kolik")

    for (let i = 0; i < 5; i += 1) {
      await user.click(counterButton("Už obsazeno mimo aplikaci", "více"))
    }
    for (let i = 0; i < 8; i += 1) {
      await user.click(counterButton("Maximum", "méně"))
    }
    expect(screen.getByText("Chybí 3 do minima")).toBeInTheDocument()
    await continueToNextStep(user)

    expect(await screen.findByText("Maximum musí být alespoň jako minimum")).toBeInTheDocument()
    expect(screen.getByText("Obsazených míst nemůže být víc než maximum")).toBeInTheDocument()
    expect(screen.getByText("Krok 2 ze 3 · Kdo a kolik")).toBeInTheDocument()
  })

  it("arrives on the last step without a submit having happened", async () => {
    const { onSubmit, user } = await renderForm()
    await fillFirstStep(user)
    await continueToNextStep(user)
    await screen.findByText("Krok 2 ze 3 · Kdo a kolik")
    await continueToNextStep(user)

    await screen.findByText("Krok 3 ze 3 · Detaily a zveřejnění")
    expect(screen.queryByText("Napište pár vět o akci")).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("goes back a step without losing what was typed", async () => {
    const { user } = await renderForm()
    await fillFirstStep(user)
    await continueToNextStep(user)
    await screen.findByText("Krok 2 ze 3 · Kdo a kolik")

    await user.click(screen.getByRole("button", { name: "Zpět na předchozí krok" }))

    expect(screen.getByText("Krok 1 ze 3 · Co a kdy")).toBeInTheDocument()
    expect(screen.getByLabelText("Název")).toHaveValue("  Čtvrteční florbal ")
    expect(screen.getByLabelText("Datum")).toHaveValue("2030-01-15")
  })

  it("previews the event and publishes it with trimmed values", async () => {
    const { onSubmit, user } = await renderForm()
    await fillFirstStep(user)
    await continueToNextStep(user)
    await screen.findByText("Krok 2 ze 3 · Kdo a kolik")

    for (let i = 0; i < 4; i += 1) {
      await user.click(counterButton("Už obsazeno mimo aplikaci", "více"))
    }
    await user.type(screen.getByLabelText("Příspěvek na místo v Kč (nepovinné)"), "80")
    await user.type(screen.getByLabelText("Poznámka k příspěvku (nepovinné)"), " na místě ")
    await continueToNextStep(user)

    expect(await screen.findByText("Krok 3 ze 3 · Detaily a zveřejnění")).toBeInTheDocument()
    await user.type(screen.getByLabelText("Popis akce"), "Rekreační hra.")
    await user.type(screen.getByLabelText("Vybavení (nepovinné)"), "   ")
    await user.click(screen.getByRole("radio", { name: "Soukromé prostory" }))

    const preview = screen.getByRole("region", { name: "Takto uvidí akci ostatní" })
    expect(within(preview).getByText("Čtvrteční florbal")).toBeInTheDocument()
    expect(within(preview).getByText("Praha 8")).toBeInTheDocument()
    expect(within(preview).getByText("19:00")).toBeInTheDocument()
    expect(within(preview).getByText("chybí 4")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Zveřejnit akci" }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Čtvrteční florbal",
      activityId: "a-florbal",
      description: "Rekreační hra.",
      equipment: undefined,
      venueType: "PRIVATE_VENUE",
      startAt: new Date("2030-01-15T19:00:00").toISOString(),
      endAt: new Date("2030-01-15T20:30:00").toISOString(),
      location: {
        street: "Chabařovická 4",
        city: "Praha 8",
        postalCode: "182 00",
        country: "Česko",
        placeName: undefined,
      },
      minParticipants: 8,
      maxParticipants: 12,
      externalOccupiedSpots: 4,
      contributionAmount: 80,
      contributionNote: "na místě",
    })
  })

  it("shows the error and keeps the values when publishing fails", async () => {
    await renderForm({ errorMessage: "Akci se nepodařilo zveřejnit. Zkuste to prosím znovu." })

    expect(
      screen.getByText("Akci se nepodařilo zveřejnit. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Pokračovat" })).toBeEnabled()
  })
})

describe("EventForm on a desktop", () => {
  beforeEach(() => setViewport(true))

  it("shows every section at once with the preview beside them", async () => {
    const { onSubmit, user } = await renderForm()

    expect(screen.getByRole("heading", { name: "1 · Co a kdy" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "2 · Kdo a kolik" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "3 · Detaily a zveřejnění" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Takto uvidí akci ostatní" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Pokračovat" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Zveřejnit akci" }))

    expect(await screen.findByText("Zadejte název akce")).toBeInTheDocument()
    expect(screen.getByText("Napište pár vět o akci")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { LocationStep } from "@/features/onboarding/components/LocationStep"

const suggestion = {
  label: "Sokolovská 12, 186 00 Praha 8, Česko",
  street: "Sokolovská 12",
  city: "Praha 8",
  postalCode: "186 00",
  country: "Česko",
  latitude: 50.0942,
  longitude: 14.4421,
}

// The geocoder is not under test: the picker offers one fixed address.
vi.mock("@/components/hobbyhub/AddressSearch", () => ({
  AddressSearch: ({
    value,
    placeholder,
    onSelect,
  }: {
    value: string
    placeholder: string
    onSelect: (address: typeof suggestion) => void
  }) => (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
    >
      {value || placeholder}
    </button>
  ),
}))

vi.mock("@/lib/addressSuggestions", () => ({ hasAddressSuggestions: () => true }))

const savedAddress = {
  street: "Cejl 1",
  city: "Brno",
  postalCode: "602 00",
  country: "Česko",
  latitude: 49.2,
  longitude: 16.6,
}

const stepFor = (
  onSubmit = vi.fn().mockResolvedValue(undefined),
  initial = {},
  onSkip = vi.fn(),
) => (
  <LocationStep
    initial={{ address: null, travelRadiusKm: null, ...initial }}
    isLast={false}
    isReturningToEvent={false}
    isSaving={false}
    hasSaveError={false}
    onSubmit={onSubmit}
    onSkip={onSkip}
    onSkipAll={vi.fn()}
  />
)

const renderStep = async (...args: Parameters<typeof stepFor>) => {
  await renderWithRouter(stepFor(...args))
  return args[0] ?? undefined
}

describe("LocationStep", () => {
  it("starts the range at 25 km", async () => {
    await renderStep()

    expect(screen.getByRole("slider", { name: "Jak daleko pojedete?" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    )
  })

  it("keeps the range between 5 and 100 km", async () => {
    await renderStep()

    const slider = screen.getByRole("slider", { name: "Jak daleko pojedete?" })
    expect(slider).toHaveAttribute("aria-valuemin", "5")
    expect(slider).toHaveAttribute("aria-valuemax", "100")
  })

  it("skips the step when no address is picked and the way on is pressed", async () => {
    const onSkip = vi.fn()
    const onSubmit = vi.fn()
    await renderStep(onSubmit, {}, onSkip)

    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("still skips the step when only the range was moved", async () => {
    const onSkip = vi.fn()
    const onSubmit = vi.fn()
    await renderStep(onSubmit, {}, onSkip)

    screen.getByRole("slider", { name: "Jak daleko pojedete?" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the picked address with its position and the range", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    await renderStep(onSubmit)

    await userEvent.click(screen.getByRole("button", { name: "Začněte psát ulici a město" }))
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSubmit).toHaveBeenCalledWith({
      street: "Sokolovská 12",
      city: "Praha 8",
      postalCode: "186 00",
      country: "Česko",
      latitude: 50.0942,
      longitude: 14.4421,
      travelRadiusKm: 25,
    })
  })

  it("shows what was saved before", async () => {
    await renderStep(undefined, { address: savedAddress, travelRadiusKm: 40 })

    expect(screen.getByText("Cejl 1, 602 00 Brno, Česko")).toBeInTheDocument()
    expect(screen.getByText("40 km")).toBeInTheDocument()
  })

  it("saves a moved range for an address saved before", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    await renderStep(onSubmit, { address: savedAddress, travelRadiusKm: 25 })

    screen.getByRole("slider", { name: "Jak daleko pojedete?" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSubmit).toHaveBeenCalledWith({ ...savedAddress, travelRadiusKm: 30 })
  })

  it("asks before the page is left with an address that was not saved", async () => {
    const { navigateAway } = await renderWithRouter(stepFor())

    await userEvent.click(screen.getByRole("button", { name: "Začněte psát ulici a město" }))
    void navigateAway()

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })
})

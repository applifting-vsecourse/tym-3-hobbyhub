import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LocationStep } from "@/features/onboarding/components/LocationStep"

const renderStep = (
  onSubmit = vi.fn().mockResolvedValue(undefined),
  initial = {},
  onSkip = vi.fn(),
) => {
  render(
    <LocationStep
      initial={{ city: null, street: null, travelRadiusKm: null, ...initial }}
      isLast={false}
      isReturningToEvent={false}
      isSaving={false}
      hasSaveError={false}
      onSubmit={onSubmit}
      onSkip={onSkip}
      onSkipAll={vi.fn()}
    />,
  )
  return onSubmit
}

describe("LocationStep", () => {
  it("starts the range at 25 km", () => {
    renderStep()

    expect(screen.getByRole("slider", { name: "Jak daleko pojedete?" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    )
  })

  it("keeps the range between 5 and 100 km", () => {
    renderStep()

    const slider = screen.getByRole("slider", { name: "Jak daleko pojedete?" })
    expect(slider).toHaveAttribute("aria-valuemin", "5")
    expect(slider).toHaveAttribute("aria-valuemax", "100")
  })

  it("skips the step when nothing is typed and the way on is pressed", async () => {
    const onSkip = vi.fn()
    renderStep(undefined, {}, onSkip)

    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it("asks for the city when only the street is typed", async () => {
    const onSubmit = renderStep()

    await userEvent.type(screen.getByLabelText("Ulice a číslo (nepovinné)"), "Cejl 1")
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(await screen.findByText("Zadejte město.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the city and the range, and drops a blank street", async () => {
    const onSubmit = renderStep()

    await userEvent.type(screen.getByLabelText("Město"), " Praha 8 ")
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(onSubmit).toHaveBeenCalledWith({
      city: "Praha 8",
      street: undefined,
      travelRadiusKm: 25,
    })
  })

  it("shows what was saved before", () => {
    renderStep(undefined, { city: "Brno", street: "Cejl 1", travelRadiusKm: 40 })

    expect(screen.getByLabelText("Město")).toHaveValue("Brno")
    expect(screen.getByLabelText("Ulice a číslo (nepovinné)")).toHaveValue("Cejl 1")
    expect(screen.getByText("40 km")).toBeInTheDocument()
  })

  it("does not skip when only the range was moved, it asks for the city", async () => {
    const onSkip = vi.fn()
    const onSubmit = renderStep(undefined, {}, onSkip)

    screen.getByRole("slider", { name: "Jak daleko pojedete?" }).focus()
    await userEvent.keyboard("{ArrowRight}")
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(await screen.findByText("Zadejte město.")).toBeInTheDocument()
    expect(onSkip).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("does not skip when a saved city was emptied, it asks for one", async () => {
    const onSkip = vi.fn()
    renderStep(undefined, { city: "Brno", travelRadiusKm: 25 }, onSkip)

    await userEvent.clear(screen.getByLabelText("Město"))
    await userEvent.click(screen.getByRole("button", { name: "Pokračovat" }))

    expect(await screen.findByText("Zadejte město.")).toBeInTheDocument()
    expect(onSkip).not.toHaveBeenCalled()
  })
})

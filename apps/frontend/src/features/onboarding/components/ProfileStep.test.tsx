import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { ProfileStep } from "@/features/onboarding/components/ProfileStep"

const renderStep = (
  onSubmit = vi.fn().mockResolvedValue(undefined),
  onSkip = vi.fn(),
  bio: string | null = null,
) => {
  render(
    <ProfileStep
      initial={{ bio }}
      isLast={true}
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

describe("ProfileStep", () => {
  beforeAll(() => {
    // jsdom has no matchMedia; the picture sheet needs one to pick dialog or drawer.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it("counts the characters of the bio", async () => {
    renderStep()

    expect(screen.getByText("0 / 300 znaků")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Krátké bio (nepovinné)"), "Hraju rok")
    expect(screen.getByText("9 / 300 znaků")).toBeInTheDocument()
  })

  it("refuses a bio over 300 characters", async () => {
    const onSubmit = renderStep()

    await userEvent.click(screen.getByLabelText("Krátké bio (nepovinné)"))
    await userEvent.paste("a".repeat(301))
    await userEvent.click(screen.getByRole("button", { name: "Dokončit" }))

    expect(await screen.findByText("Bio může mít nejvýše 300 znaků.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("passes the step when the bio is empty and the way on is pressed", async () => {
    const onSkip = vi.fn()
    const onSubmit = renderStep(undefined, onSkip)

    await userEvent.click(screen.getByRole("button", { name: "Dokončit" }))

    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("finishes with the bio that was written", async () => {
    const onSubmit = renderStep()

    await userEvent.type(screen.getByLabelText("Krátké bio (nepovinné)"), "Hraju rok")
    await userEvent.click(screen.getByRole("button", { name: "Dokončit" }))

    expect(onSubmit).toHaveBeenCalledWith({ bio: "Hraju rok" })
  })

  it("saves an emptied bio that was saved before instead of skipping", async () => {
    const onSkip = vi.fn()
    const onSubmit = renderStep(undefined, onSkip, "Hraju rok")

    await userEvent.clear(screen.getByLabelText("Krátké bio (nepovinné)"))
    await userEvent.click(screen.getByRole("button", { name: "Dokončit" }))

    expect(onSubmit).toHaveBeenCalledWith({ bio: undefined })
    expect(onSkip).not.toHaveBeenCalled()
  })
})

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Onboarding } from "@/features/onboarding/api/onboardingSchemas"
import { OnboardingWizard } from "@/features/onboarding/components/OnboardingWizard"

const requests = vi.hoisted(() => ({
  getOnboarding: vi.fn(),
  saveActivities: vi.fn(),
  saveLocation: vi.fn(),
  saveProfile: vi.fn(),
  skipStep: vi.fn(),
  finishOnboarding: vi.fn(),
  skipOnboarding: vi.fn(),
}))
vi.mock("@/features/onboarding/api/onboardingRequests", () => requests)

const onboarding = (overrides: Partial<Onboarding> = {}): Onboarding => ({
  stepsDone: 0,
  skipped: false,
  completedAt: null,
  interests: [],
  address: null,
  travelRadiusKm: null,
  bio: null,
  ...overrides,
})

const renderWizard = async (state: Onboarding) => {
  requests.getOnboarding.mockResolvedValue(state)
  const onLeave = vi.fn()
  await renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OnboardingWizard
        activities={[{ id: "a1", name: "Florbal", icon: "florbal" }]}
        isLoadingActivities={false}
        activitiesError={null}
        onReloadActivities={vi.fn()}
        activityLabel={(activity) => activity.name}
        levels={[]}
        isReturningToEvent={false}
        onLeave={onLeave}
      />
    </QueryClientProvider>,
  )
  return onLeave
}

describe("OnboardingWizard", () => {
  beforeAll(() => {
    // jsdom has no matchMedia; the profile step's picture sheet needs one.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("starts at the first step", async () => {
    await renderWizard(onboarding())

    expect(await screen.findByRole("heading", { name: "Co rádi hrajete?" })).toBeInTheDocument()
    expect(screen.getByText("Krok 1 ze 3")).toBeInTheDocument()
  })

  it("resumes at the first step that is still open", async () => {
    await renderWizard(onboarding({ stepsDone: 1 }))

    expect(await screen.findByRole("heading", { name: "Kde hrajete?" })).toBeInTheDocument()
    expect(screen.getByText("Krok 2 ze 3")).toBeInTheDocument()
  })

  it("opens the last step again when every step is done but it was not finished", async () => {
    await renderWizard(onboarding({ stepsDone: 3 }))

    expect(await screen.findByRole("heading", { name: "Ukažte se ostatním" })).toBeInTheDocument()
    expect(screen.getByText("Krok 3 ze 3")).toBeInTheDocument()
  })

  it("reopens a finished wizard at the first thing the profile lacks", async () => {
    await renderWizard(onboarding({ stepsDone: 3, skipped: true, completedAt: new Date() }))

    expect(await screen.findByRole("heading", { name: "Co rádi hrajete?" })).toBeInTheDocument()
  })

  it("skips a step and moves on", async () => {
    requests.skipStep.mockResolvedValue(onboarding({ stepsDone: 1, skipped: true }))
    await renderWizard(onboarding())

    await userEvent.click(await screen.findByRole("button", { name: "Pokračovat" }))

    expect(requests.skipStep.mock.calls[0]?.[0]).toBe("ACTIVITIES")
    expect(await screen.findByRole("heading", { name: "Kde hrajete?" })).toBeInTheDocument()
  })

  it("skips everything and leaves", async () => {
    requests.skipOnboarding.mockResolvedValue(
      onboarding({ skipped: true, completedAt: new Date() }),
    )
    const onLeave = await renderWizard(onboarding())

    await userEvent.click(await screen.findByRole("button", { name: "Přeskočit vše" }))

    expect(requests.skipOnboarding).toHaveBeenCalledTimes(1)
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it("stays on the step and says so when saving fails", async () => {
    requests.skipStep.mockRejectedValue(new Error("down"))
    const onLeave = await renderWizard(onboarding())

    await userEvent.click(await screen.findByRole("button", { name: "Pokračovat" }))

    expect(await screen.findByText("Uložení se nepodařilo. Zkuste to znovu.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Co rádi hrajete?" })).toBeInTheDocument()
    expect(onLeave).not.toHaveBeenCalled()
  })

  it("goes back to the previous step", async () => {
    await renderWizard(onboarding({ stepsDone: 1 }))

    await userEvent.click(await screen.findByRole("button", { name: "Zpět" }))

    expect(await screen.findByRole("heading", { name: "Co rádi hrajete?" })).toBeInTheDocument()
    expect(screen.getByText("Krok 1 ze 3")).toBeInTheDocument()
  })

  it("moves focus to the heading of the step it opens", async () => {
    await renderWizard(onboarding({ stepsDone: 1 }))

    await userEvent.click(await screen.findByRole("button", { name: "Zpět" }))

    expect(await screen.findByRole("heading", { name: "Co rádi hrajete?" })).toHaveFocus()
  })

  it("leaves focus alone on the step the page opens at", async () => {
    await renderWizard(onboarding())

    const heading = await screen.findByRole("heading", { name: "Co rádi hrajete?" })
    expect(heading).not.toHaveFocus()
  })

  it("saves the bio, finishes the wizard and leaves from the last step", async () => {
    requests.saveProfile.mockResolvedValue(onboarding({ stepsDone: 3, bio: "Hraju rok" }))
    requests.finishOnboarding.mockResolvedValue(
      onboarding({ stepsDone: 3, completedAt: new Date() }),
    )
    const onLeave = await renderWizard(onboarding({ stepsDone: 2 }))

    await userEvent.type(await screen.findByLabelText("Krátké bio (nepovinné)"), "Hraju rok")
    await userEvent.click(screen.getByRole("button", { name: "Dokončit" }))

    expect(requests.saveProfile.mock.calls[0]?.[0]).toEqual({ bio: "Hraju rok" })
    expect(requests.finishOnboarding).toHaveBeenCalledTimes(1)
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it("skips the last step, finishes the wizard and leaves", async () => {
    requests.skipStep.mockResolvedValue(onboarding({ stepsDone: 3, skipped: true }))
    requests.finishOnboarding.mockResolvedValue(
      onboarding({ stepsDone: 3, completedAt: new Date() }),
    )
    const onLeave = await renderWizard(onboarding({ stepsDone: 2 }))

    await userEvent.click(await screen.findByRole("button", { name: "Dokončit" }))

    expect(requests.skipStep.mock.calls[0]?.[0]).toBe("PROFILE")
    expect(requests.finishOnboarding).toHaveBeenCalledTimes(1)
    expect(onLeave).toHaveBeenCalledTimes(1)
  })
})

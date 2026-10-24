import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Onboarding } from "@/features/onboarding/api/onboardingSchemas"
import { ProfilePrompt } from "@/features/onboarding/components/ProfilePrompt"

const requests = vi.hoisted(() => ({ getOnboarding: vi.fn() }))
vi.mock("@/features/onboarding/api/onboardingRequests", () => requests)

// The prompt links to the wizard; the router itself is not under test here.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
    <a
      href="/onboarding"
      {...props}
    >
      {children}
    </a>
  ),
}))

const onboarding = (overrides: Partial<Onboarding> = {}): Onboarding => ({
  stepsDone: 0,
  skipped: false,
  completedAt: null,
  interests: [],
  city: null,
  street: null,
  travelRadiusKm: null,
  bio: null,
  ...overrides,
})

const renderPrompt = (state: Onboarding) => {
  requests.getOnboarding.mockResolvedValue(state)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfilePrompt />
    </QueryClientProvider>,
  )
}

describe("ProfilePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ["an onboarding that was never started", onboarding()],
    ["one that was left half-way", onboarding({ stepsDone: 1 })],
    [
      "one that ended without a set-up profile",
      onboarding({ completedAt: new Date(), skipped: true }),
    ],
  ])("asks to finish the profile after %s", async (_name, state) => {
    renderPrompt(state)

    expect(
      await screen.findByRole("link", { name: "Dokončit nastavení profilu" }),
    ).toBeInTheDocument()
  })

  it("says nothing once the onboarding ended with a set-up profile", async () => {
    renderPrompt(onboarding({ stepsDone: 3, completedAt: new Date(), skipped: false }))

    await vi.waitFor(() => expect(requests.getOnboarding).toHaveBeenCalled())
    expect(
      screen.queryByRole("link", { name: "Dokončit nastavení profilu" }),
    ).not.toBeInTheDocument()
  })
})

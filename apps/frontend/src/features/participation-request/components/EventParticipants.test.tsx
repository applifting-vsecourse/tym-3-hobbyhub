import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { EventParticipants } from "@/features/participation-request/components/EventParticipants"
import type { ParticipantsTab } from "@/features/participation-request/components/ParticipantsTabs"
import type { ManagedEventOverview } from "@/features/participation-request/lib/requestDecision"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const NOW = new Date(2030, 0, 1, 12, 0)

const anEvent = (overrides: Partial<ManagedEventOverview> = {}): ManagedEventOverview => ({
  id: "e1",
  title: "Čtvrteční florbal",
  when: "Dnes 19:00",
  status: "PUBLISHED",
  startAt: new Date(2030, 0, 1, 19, 0),
  endAt: new Date(2030, 0, 1, 20, 30),
  approvalMode: "MANUAL",
  taken: 7,
  min: 8,
  max: 12,
  approved: 4,
  externalOccupied: 3,
  fillState: "BELOW_MINIMUM",
  ...overrides,
})

beforeEach(() => {
  get.mockReset()
  // Every list is empty: 2 requests wait, nobody else.
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path.endsWith("/decided") ? { items: [], total: 0 } : { items: [], total: 2 },
      ),
  }))
})

const renderPage = (event: ManagedEventOverview = anEvent(), tab: ParticipantsTab = "requests") =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <EventParticipants
        event={event}
        tab={tab}
        now={NOW}
      />
    </QueryClientProvider>,
  )

describe("EventParticipants", () => {
  it.each([
    ["BELOW_MINIMUM", "Pod minimem"],
    ["MINIMUM_REACHED", "Minimum splněno"],
    ["FULL", "Plno"],
  ] as const)("shows the %s event as „%s“", async (fillState, label) => {
    await renderPage(anEvent({ fillState }))

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("splits the occupancy into the app and outside it", async () => {
    await renderPage()

    expect(screen.getByText("4 z aplikace, 3 mimo aplikaci")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Místa mimo aplikaci" })).toHaveValue("3")
  })

  it("counts the waiting requests and the seats on the tabs", async () => {
    await renderPage()

    expect(await screen.findByRole("link", { name: "Žádosti 2" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("link", { name: "Účastníci 7" })).toBeInTheDocument()
  })

  it("shows the participants on their tab", async () => {
    await renderPage(anEvent(), "participants")

    expect(await screen.findByRole("heading", { name: /^Schválení/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /^Zamítnutí/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /^Odhlášení/ })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: /^Žádosti/ })).not.toBeInTheDocument()
  })
})

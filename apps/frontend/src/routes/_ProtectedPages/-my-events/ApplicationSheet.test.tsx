import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { myEventsKeys } from "@/lib/my-events-keys"

import { eventKeys } from "@/features/event/api/eventKeys"
import type { EventListItem } from "@/features/event/api/eventSchemas"
import type { MyApplication } from "@/features/event/api/myEventsSchemas"

import { ApplicationSheet, type ApplicationSheetState } from "./ApplicationSheet"

const { withdrawRequest, toast } = vi.hoisted(() => ({
  withdrawRequest: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/features/participation-request/api/withdrawRequest", () => ({ withdrawRequest }))
vi.mock("sonner", () => ({ toast }))

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

beforeEach(() => {
  withdrawRequest.mockReset()
  toast.success.mockReset()
  toast.error.mockReset()
})

const event = (overrides: Partial<EventListItem> = {}): EventListItem => ({
  id: "e1",
  title: "Čtvrteční florbal",
  imageUrl: null,
  startAt: new Date(2026, 9, 22, 19, 0),
  endAt: new Date(2026, 9, 22, 21, 0),
  venueType: "PUBLIC_VENUE",
  placeName: "ZŠ Kobylisy",
  district: "Praha 8",
  city: "Praha",
  level: "Pokročilí",
  latitude: null,
  longitude: null,
  distanceKm: null,
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 8,
  maxParticipants: 10,
  takenCount: 7,
  ...overrides,
})

const waiting: MyApplication = { status: "PENDING", event: event() }

const OPEN: ApplicationSheetState = { eventId: "e1", step: "withdraw" }

// The page owns the list and the state. The list comes in from the test, as a
// refetch would bring it; the button stands in for the row's menu.
function Page({
  applications,
  initial,
}: {
  applications: MyApplication[]
  initial: ApplicationSheetState
}) {
  const [sheet, setSheet] = useState(initial)
  return (
    <>
      <p>krok: {sheet.step ?? "zavřeno"}</p>
      <button onClick={() => setSheet(OPEN)}>Vybrat florbal</button>
      <ApplicationSheet
        applications={applications}
        state={sheet}
        onStepChange={(step) => setSheet((shown) => ({ ...shown, step }))}
      />
    </>
  )
}

const renderPage = (initial: ApplicationSheetState) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const page = (applications: MyApplication[]) => (
    <QueryClientProvider client={queryClient}>
      <Page
        applications={applications}
        initial={initial}
      />
    </QueryClientProvider>
  )
  const { rerender } = render(page([waiting]))
  return {
    invalidatedKeys: () => invalidate.mock.calls.map(([filters]) => filters?.queryKey),
    refetched: (applications: MyApplication[]) => rerender(page(applications)),
  }
}

describe("ApplicationSheet", () => {
  it("is mounted closed and opens on the chosen application", async () => {
    renderPage({ eventId: null, step: null })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Vybrat florbal" }))

    const dialog = await screen.findByRole("dialog", { name: "Zrušit žádost o účast?" })
    expect(within(dialog).getByText("Čtvrteční florbal")).toBeInTheDocument()
    // The level is the catalogue's name, joined to the place as on the detail.
    expect(within(dialog).getByText("ZŠ Kobylisy, Praha 8, Pokročilí")).toBeInTheDocument()
  })

  it("shows the application as the list has it now, not as it was when opened", async () => {
    const { refetched } = renderPage(OPEN)
    const dialog = await screen.findByRole("dialog")

    refetched([{ ...waiting, event: event({ title: "Páteční florbal" }) }])

    expect(within(dialog).getByText("Páteční florbal")).toBeInTheDocument()
  })

  it("keeps the event it was about when a refresh drops the row", async () => {
    const { refetched } = renderPage(OPEN)
    const dialog = await screen.findByRole("dialog")

    refetched([])

    expect(within(dialog).getByText("Čtvrteční florbal")).toBeInTheDocument()
  })

  it("refreshes the event's detail and the event lists, not just the overview", async () => {
    withdrawRequest.mockResolvedValue(undefined)
    const { invalidatedKeys } = renderPage(OPEN)

    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Zrušit žádost" }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost zrušena"))
    expect(screen.getByText("krok: zavřeno")).toBeInTheDocument()
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([eventKeys.detail("e1"), eventKeys.lists(), myEventsKeys.all()]),
    )
  })
})

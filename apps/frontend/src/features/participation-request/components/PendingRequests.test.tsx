import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { DecisionRefusedError } from "@/features/participation-request/api/decideRequest"
import { PendingRequests } from "@/features/participation-request/components/PendingRequests"
import type { ManagedEvent } from "@/features/participation-request/lib/requestDecision"

const { get, approveRequest, rejectRequest, toast } = vi.hoisted(() => ({
  get: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))
vi.mock("@/features/participation-request/api/decideRequest", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  approveRequest,
  rejectRequest,
}))
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

const NOW = new Date(2030, 0, 1, 12, 0)

const anEvent = (overrides: Partial<ManagedEvent> = {}): ManagedEvent => ({
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
  ...overrides,
})

const aRequest = (id: string, name = "Honza_K") => ({
  id,
  eventId: "e1",
  status: "PENDING",
  message: "Hraju třetí rok za firemní tým.",
  requestedAt: "2029-12-30T10:00:00.000Z",
  applicant: { name, image: null, bio: "Florbal hraju od školy.", hasVerifiedEmail: true },
})

// One page of the list, as the API answers it. ky's `get()` has `.json()` on
// the returned promise itself.
const answer = (items: unknown[], total = items.length) =>
  get.mockReturnValueOnce({ json: () => Promise.resolve({ items, total }) })

beforeEach(() => {
  get.mockReset()
  approveRequest.mockReset()
  rejectRequest.mockReset()
  toast.success.mockReset()
  toast.error.mockReset()
})

const renderList = (event: ManagedEvent = anEvent()) =>
  renderWithRouter(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <PendingRequests
        event={event}
        now={NOW}
      />
    </QueryClientProvider>,
  )

describe("PendingRequests", () => {
  it("shows who asks, what they wrote and what approval changes", async () => {
    answer([aRequest("r1")])
    await renderList()

    const card = (await screen.findByRole("heading", { name: "Honza_K" })).closest("article")!
    expect(within(card).getByText("Ověřený e-mail")).toBeInTheDocument()
    expect(within(card).getByText("Florbal hraju od školy.")).toBeInTheDocument()
    expect(within(card).getByText("Hraju třetí rok za firemní tým.")).toBeInTheDocument()
    expect(within(card).getByText("Po schválení bude minimum splněno (8 z 8).")).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("events/e1/requests", {
      searchParams: { limit: "20", offset: "0" },
    })
  })

  it("approves a request and loads the list again", async () => {
    answer([aRequest("r1")])
    approveRequest.mockResolvedValue({})
    await renderList()
    answer([])

    await userEvent.click(await screen.findByRole("button", { name: "Schválit" }))

    expect(approveRequest).toHaveBeenCalledWith({ eventId: "e1", requestId: "r1" })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost schválena"))
    expect(
      await screen.findByText(
        "Zatím tu nejsou žádné žádosti. Objeví se tu, jakmile o účast někdo požádá.",
      ),
    ).toBeInTheDocument()
  })

  it("says why an approval was refused", async () => {
    answer([aRequest("r1")])
    approveRequest.mockRejectedValue(new DecisionRefusedError(["EVENT_FULL"]))
    await renderList()
    answer([aRequest("r1")])

    await userEvent.click(await screen.findByRole("button", { name: "Schválit" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Akce se mezitím zaplnila, žádost už nejde schválit.",
      ),
    )
  })

  it("rejects with the reason after warning that it is final", async () => {
    answer([aRequest("r1")])
    rejectRequest.mockResolvedValue({})
    await renderList()
    answer([])

    await userEvent.click(await screen.findByRole("button", { name: "Zamítnout" }))
    const dialog = await screen.findByRole("dialog", { name: "Zamítnout žádost?" })
    expect(
      within(dialog).getByText("Honza_K už o tuhle akci nebude moct požádat znovu."),
    ).toBeInTheDocument()
    await userEvent.type(
      within(dialog).getByLabelText("Důvod (nepovinné)"),
      "  Hledáme začátečníky ",
    )
    await userEvent.click(within(dialog).getByRole("button", { name: "Zamítnout žádost" }))

    expect(rejectRequest).toHaveBeenCalledWith({
      eventId: "e1",
      requestId: "r1",
      reason: "Hledáme začátečníky",
    })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Žádost zamítnuta"))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("rejects without a reason, and keeps the request when the sheet is closed", async () => {
    answer([aRequest("r1")])
    await renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Zamítnout" }))
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Nechat čekat" }),
    )

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(rejectRequest).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "Honza_K" })).toBeInTheDocument()
  })

  it("refuses a reason over 500 characters before sending", async () => {
    answer([aRequest("r1")])
    await renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Zamítnout" }))
    const dialog = await screen.findByRole("dialog")
    const field = within(dialog).getByLabelText("Důvod (nepovinné)")
    await userEvent.click(field)
    await userEvent.paste("a".repeat(501))
    await userEvent.click(within(dialog).getByRole("button", { name: "Zamítnout žádost" }))

    expect(await within(dialog).findByText("Důvod může mít nejvýš 500 znaků.")).toBeInTheDocument()
    expect(rejectRequest).not.toHaveBeenCalled()
  })

  it("lets a full event only reject, and says why", async () => {
    answer([aRequest("r1")])
    await renderList(anEvent({ taken: 12 }))

    expect(await screen.findByRole("button", { name: "Schválit" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Zamítnout" })).toBeEnabled()
    expect(screen.getByText("Akce je plná, žádost jde jen zamítnout.")).toBeInTheDocument()
  })

  it("shows the requests without buttons once the event has started", async () => {
    answer([aRequest("r1")])
    await renderList(anEvent({ startAt: new Date(2030, 0, 1, 11, 0) }))

    expect(await screen.findByRole("heading", { name: "Honza_K" })).toBeInTheDocument()
    expect(screen.getByText("Akce už začala, žádosti už nejde vyřídit.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Schválit" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Zamítnout" })).not.toBeInTheDocument()
  })

  it("loads the next page after the first 20", async () => {
    answer(
      Array.from({ length: 20 }, (_, index) => aRequest(`r${index}`, `Hráč ${index}`)),
      25,
    )
    await renderList()
    answer(
      Array.from({ length: 5 }, (_, index) => aRequest(`s${index}`, `Další ${index}`)),
      25,
    )

    await userEvent.click(await screen.findByRole("button", { name: "5 dalších žádostí" }))

    expect(await screen.findByRole("heading", { name: "Další 4" })).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("events/e1/requests", {
      searchParams: { limit: "20", offset: "20" },
    })
    expect(screen.queryByRole("button", { name: /dalších žádostí/ })).not.toBeInTheDocument()
  })

  it.each([
    ["MANUAL", "Zatím tu nejsou žádné žádosti. Objeví se tu, jakmile o účast někdo požádá."],
    [
      "AUTOMATIC",
      "Na téhle akci se žádosti schvalují samy: kdo požádá, rovnou obsadí volné místo.",
    ],
  ] as const)("says what would appear here with %s approval", async (approvalMode, text) => {
    answer([])
    await renderList(anEvent({ approvalMode }))

    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it("offers to retry when the list fails to load", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    await renderList()

    expect(await screen.findByText("Žádosti se nepodařilo načíst")).toBeInTheDocument()
    answer([aRequest("r1")])
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))

    expect(await screen.findByRole("heading", { name: "Honza_K" })).toBeInTheDocument()
  })
})

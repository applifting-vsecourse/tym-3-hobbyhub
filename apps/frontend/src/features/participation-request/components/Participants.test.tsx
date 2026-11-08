import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { SeatStatus } from "@/features/participation-request/api/participationRequestSchemas"
import { Participants } from "@/features/participation-request/components/Participants"
import type { ManagedEventOverview } from "@/features/participation-request/lib/requestDecision"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

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

const aSeat = (
  id: string,
  status: SeatStatus,
  name: string,
  overrides: { message?: string | null; asksAgain?: boolean } = {},
) => ({
  id,
  status,
  message: null,
  changedAt: "2029-12-30T10:00:00.000Z",
  asksAgain: false,
  person: { name, image: null, bio: null, hasVerifiedEmail: false },
  ...overrides,
})

type Page = { items: unknown[]; total?: number }

// Each state is its own request; answer by the `status` the list asks for.
const answer = (pages: Partial<Record<SeatStatus, Page | Error>>) =>
  get.mockImplementation((_path: string, options: { searchParams: { status: SeatStatus } }) => {
    const page = pages[options.searchParams.status] ?? { items: [] }
    return {
      json: () =>
        page instanceof Error
          ? Promise.reject(page)
          : Promise.resolve({ items: page.items, total: page.total ?? page.items.length }),
    }
  })

beforeEach(() => {
  get.mockReset()
})

const renderList = (event: ManagedEventOverview = anEvent()) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Participants event={event} />
    </QueryClientProvider>,
  )

const section = async (name: string) =>
  (await screen.findByRole("heading", { name: new RegExp(`^${name}`) })).closest("section")!

describe("Participants", () => {
  it("lists who comes, with the seats outside the app", async () => {
    answer({ APPROVED: { items: [aSeat("p1", "APPROVED", "Honza_K")] } })
    await renderList()

    const coming = await section("Přijdou")
    expect(await within(coming).findByRole("heading", { name: "Honza_K" })).toBeInTheDocument()
    expect(within(coming).getByText("K tomu 3 místa mimo aplikaci")).toBeInTheDocument()
    expect(within(coming).getByText(/^Místo má od/)).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("events/e1/participations", {
      searchParams: { status: "APPROVED", limit: "20", offset: "0" },
    })
  })

  // F-06.4.
  it("lists who gave their seat back, with their words and a new request", async () => {
    answer({
      CANCELLED: {
        items: [
          aSeat("c1", "CANCELLED", "The Bread Critic", {
            message: "Onemocněl jsem, promiňte.",
            asksAgain: true,
          }),
          aSeat("c2", "CANCELLED", "Petra", { message: "Nakonec nemůžu." }),
        ],
      },
    })
    await renderList()

    const cancelled = await section("Odhlášení")
    expect(
      await within(cancelled).findByRole("heading", { name: "The Bread Critic" }),
    ).toBeInTheDocument()
    expect(within(cancelled).getByText(/Onemocněl jsem, promiňte\./)).toBeInTheDocument()
    expect(
      within(cancelled).getByText(/^Účast zrušil\(a\) .* · Znovu žádá o účast$/),
    ).toBeInTheDocument()
    expect(within(cancelled).getByText(/^Účast zrušil\(a\) [^·]*$/)).toBeInTheDocument()
  })

  it("says what would appear in an empty section", async () => {
    answer({})
    await renderList(anEvent({ externalOccupied: 0 }))

    expect(
      await screen.findByText("Zatím tu nikdo není. Objeví se tu každý, kdo na akci získá místo."),
    ).toBeInTheDocument()
    expect(await screen.findByText("Zatím se nikdo neodhlásil.")).toBeInTheDocument()
    expect(screen.queryByText(/mimo aplikaci/)).not.toBeInTheDocument()
  })

  it("loads the rest of a long section", async () => {
    answer({ APPROVED: { items: [aSeat("p1", "APPROVED", "Honza_K")], total: 2 } })
    await renderList()

    const coming = await section("Přijdou")
    const more = await within(coming).findByRole("button", { name: "1 další účastník" })
    answer({ APPROVED: { items: [aSeat("p2", "APPROVED", "Jana")], total: 2 } })
    await userEvent.click(more)

    expect(await within(coming).findByRole("heading", { name: "Jana" })).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("events/e1/participations", {
      searchParams: { status: "APPROVED", limit: "20", offset: "1" },
    })
  })

  it("offers a retry when a section fails to load", async () => {
    answer({ CANCELLED: new Error("offline") })
    await renderList()

    const cancelled = await section("Odhlášení")
    expect(await within(cancelled).findByText("Odhlášené se nepodařilo načíst")).toBeInTheDocument()
    expect(within(cancelled).getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
  })
})

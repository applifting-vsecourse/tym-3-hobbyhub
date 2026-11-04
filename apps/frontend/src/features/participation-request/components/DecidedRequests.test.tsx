import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { DecidedStatus } from "@/features/participation-request/api/participationRequestSchemas"
import { DecidedRequests } from "@/features/participation-request/components/DecidedRequests"
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

const aPerson = (id: string, status: DecidedStatus, name: string) => ({
  id,
  status,
  message: null,
  changedAt: "2029-12-30T10:00:00.000Z",
  applicant: { name, image: null, bio: null, hasVerifiedEmail: false },
})

type Page = { items: unknown[]; total?: number }

// Each state is its own request; answer by the `status` the list asks for.
const answer = (pages: Partial<Record<DecidedStatus, Page | Error>>) =>
  get.mockImplementation((_path: string, options: { searchParams: { status: DecidedStatus } }) => {
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
      <DecidedRequests event={event} />
    </QueryClientProvider>,
  )

const section = async (name: string) =>
  (await screen.findByRole("heading", { name: new RegExp(`^${name}`) })).closest("section")!

describe("DecidedRequests", () => {
  it("lists the approved, rejected and withdrawn people each in their own section", async () => {
    answer({
      APPROVED: { items: [aPerson("p1", "APPROVED", "Honza_K")] },
      REJECTED: { items: [aPerson("r1", "REJECTED", "Petra")] },
      WITHDRAWN: { items: [aPerson("w1", "WITHDRAWN", "Tomáš")] },
    })
    await renderList()

    const approved = await section("Schválení")
    expect(await within(approved).findByRole("heading", { name: "Honza_K" })).toBeInTheDocument()
    expect(within(approved).getByText("K tomu 3 místa mimo aplikaci")).toBeInTheDocument()
    expect(within(approved).getByText(/^Místo má od/)).toBeInTheDocument()
    const rejected = await section("Zamítnutí")
    expect(await within(rejected).findByRole("heading", { name: "Petra" })).toBeInTheDocument()
    expect(within(rejected).getByText(/^Zamítnuto/)).toBeInTheDocument()
    const withdrawn = await section("Odhlášení")
    expect(await within(withdrawn).findByRole("heading", { name: "Tomáš" })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("events/e1/requests/decided", {
      searchParams: { status: "WITHDRAWN", limit: "20", offset: "0" },
    })
  })

  it("says what would appear in an empty section", async () => {
    answer({})
    await renderList(anEvent({ externalOccupied: 0 }))

    expect(
      await screen.findByText("Zatím tu nikdo není. Objeví se tu každý, kdo na akci získá místo."),
    ).toBeInTheDocument()
    expect(await screen.findByText("Zatím jsi žádnou žádost nezamítl.")).toBeInTheDocument()
    expect(await screen.findByText("Zatím nikdo svou žádost nestáhl.")).toBeInTheDocument()
    expect(screen.queryByText(/mimo aplikaci/)).not.toBeInTheDocument()
  })

  it("loads the rest of a long section", async () => {
    answer({ APPROVED: { items: [aPerson("p1", "APPROVED", "Honza_K")], total: 2 } })
    await renderList()

    const approved = await section("Schválení")
    const more = await within(approved).findByRole("button", { name: "1 další účastník" })
    answer({ APPROVED: { items: [aPerson("p2", "APPROVED", "Jana")], total: 2 } })
    await userEvent.click(more)

    expect(await within(approved).findByRole("heading", { name: "Jana" })).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("events/e1/requests/decided", {
      searchParams: { status: "APPROVED", limit: "20", offset: "1" },
    })
  })

  it("offers a retry when a section fails to load", async () => {
    answer({ REJECTED: new Error("offline") })
    await renderList()

    const rejected = await section("Zamítnutí")
    expect(
      await within(rejected).findByText("Zamítnuté žádosti se nepodařilo načíst"),
    ).toBeInTheDocument()
    expect(within(rejected).getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
  })
})

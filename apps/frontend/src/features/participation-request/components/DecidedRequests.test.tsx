import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { DecidedStatus } from "@/features/participation-request/api/participationRequestSchemas"
import { DecidedRequests } from "@/features/participation-request/components/DecidedRequests"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

const aRequest = (id: string, status: DecidedStatus, name: string) => ({
  id,
  status,
  userId: `user-${id}`,
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

const renderList = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <DecidedRequests eventId="e1" />
    </QueryClientProvider>,
  )

const section = async (name: string) =>
  (await screen.findByRole("heading", { name: new RegExp(`^${name}`) })).closest("section")!

describe("DecidedRequests", () => {
  it("lists the rejected and withdrawn requests each in their own section", async () => {
    answer({
      REJECTED: { items: [aRequest("r1", "REJECTED", "Petra")] },
      WITHDRAWN: { items: [aRequest("w1", "WITHDRAWN", "Tomáš")] },
    })
    await renderList()

    const rejected = await section("Zamítnuté")
    expect(await within(rejected).findByRole("heading", { name: "Petra" })).toBeInTheDocument()
    expect(within(rejected).getByText(/^Zamítnuto/)).toBeInTheDocument()
    const withdrawn = await section("Stažené")
    expect(await within(withdrawn).findByRole("heading", { name: "Tomáš" })).toBeInTheDocument()
    expect(within(withdrawn).getByText(/^Žádost stáhl\(a\)/)).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("events/e1/requests/decided", {
      searchParams: { status: "WITHDRAWN", limit: "20", offset: "0" },
    })
  })

  it("links each name to the person's profile (F-04.2)", async () => {
    answer({ REJECTED: { items: [aRequest("p1", "REJECTED", "Honza_K")] } })
    await renderList()

    const link = await screen.findByRole("link", { name: "Honza_K" })
    expect(link.getAttribute("href")).toBe("/profile/user-p1")
  })

  it("says what would appear in an empty section", async () => {
    answer({})
    await renderList()

    expect(await screen.findByText("Zatím jsi žádnou žádost nezamítl.")).toBeInTheDocument()
    expect(await screen.findByText("Zatím nikdo svou žádost nestáhl.")).toBeInTheDocument()
  })

  it("loads the rest of a long section", async () => {
    answer({ REJECTED: { items: [aRequest("r1", "REJECTED", "Petra")], total: 2 } })
    await renderList()

    const rejected = await section("Zamítnuté")
    const more = await within(rejected).findByRole("button", {
      name: "1 další zamítnutá žádost",
    })
    answer({ REJECTED: { items: [aRequest("r2", "REJECTED", "Jana")], total: 2 } })
    await userEvent.click(more)

    expect(await within(rejected).findByRole("heading", { name: "Jana" })).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("events/e1/requests/decided", {
      searchParams: { status: "REJECTED", limit: "20", offset: "1" },
    })
  })

  it("offers a retry when a section fails to load", async () => {
    answer({ REJECTED: new Error("offline") })
    await renderList()

    const rejected = await section("Zamítnuté")
    expect(
      await within(rejected).findByText("Zamítnuté žádosti se nepodařilo načíst"),
    ).toBeInTheDocument()
    expect(within(rejected).getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
  })
})

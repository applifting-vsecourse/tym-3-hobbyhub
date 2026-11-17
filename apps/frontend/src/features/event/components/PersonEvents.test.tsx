import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { PersonEvents } from "@/features/event/components/PersonEvents"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

const withQueries = (ui: ReactNode) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  )

const anEvent = (id: string, title: string) => ({
  id,
  title,
  imageUrl: null,
  startAt: "2026-11-20T17:00:00.000Z",
  endAt: "2026-11-20T19:00:00.000Z",
  venueType: "PUBLIC_VENUE",
  placeName: "Hala ZŠ Dolní",
  district: null,
  city: "Praha",
  level: null,
  latitude: null,
  longitude: null,
  distanceKm: null,
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 4,
  maxParticipants: 10,
  takenCount: 3,
})

const page = (ids: string[], nextOffset: number | null = null) => ({
  items: ids.map((id) => anEvent(id, `Akce ${id}`)),
  total: ids.length,
  nextOffset,
})

const renderEvents = (
  pages: { upcoming?: unknown; past?: unknown },
  period: "upcoming" | "past" = "upcoming",
) =>
  withQueries(
    <PersonEvents
      userId="f1"
      pages={pages}
      loadedAt={Date.now()}
      period={period}
      activityLabel={(activity) => activity.name}
    />,
  )

describe("PersonEvents (#226)", () => {
  beforeEach(() => get.mockReset())

  it("offers both parts as tabs and shows the chosen one, without loading it again", async () => {
    await renderEvents({ upcoming: page(["u1"]), past: page(["p1"]) }, "past")

    expect(screen.getByRole("heading", { name: "Akce" })).toBeInTheDocument()
    const tabs = screen.getByRole("navigation", { name: "Nadcházející a proběhlé akce" })
    expect(tabs.querySelector('[aria-current="page"]')).toHaveTextContent("Proběhlé")
    expect(screen.getByRole("link", { name: /Akce p1/ })).toHaveAttribute("href", "/events/p1")
    expect(screen.queryByRole("link", { name: /Akce u1/ })).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it("shows only the part the friend shares, without tabs", async () => {
    await renderEvents({ upcoming: page([]) }, "past")

    expect(screen.getByRole("heading", { name: "Nadcházející akce" })).toBeInTheDocument()
    expect(screen.queryByRole("navigation")).toBeNull()
    expect(screen.getByText("Žádné nadcházející akce.")).toBeInTheDocument()
  })

  it("is not there when the friend shares nothing", async () => {
    await renderEvents({})

    expect(screen.queryByRole("heading")).toBeNull()
  })

  it("loads the next page of the part", async () => {
    get.mockReturnValueOnce({ json: () => Promise.resolve(page(["u2"])) })
    await renderEvents({ upcoming: page(["u1"], 10) })

    await userEvent.click(screen.getByRole("button", { name: "Načíst další" }))

    expect(await screen.findByRole("link", { name: /Akce u2/ })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("profile/f1/events/upcoming", {
      searchParams: { offset: 10 },
    })
  })
})

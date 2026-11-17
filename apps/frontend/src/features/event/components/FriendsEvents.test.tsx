import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { FriendsEvents, FriendsEventsPreview } from "@/features/event/components/FriendsEvents"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

const answer = (body: unknown) => get.mockReturnValueOnce({ json: () => Promise.resolve(body) })

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

const libor = { id: "f1", name: "Libor", image: null }

const NOW = new Date("2026-11-17T10:00:00.000Z")

describe("FriendsEvents (#226)", () => {
  beforeEach(() => get.mockReset())

  it("lists the events with the friends there, and loads the next page", async () => {
    answer({
      items: [{ event: anEvent("e1", "Čtvrteční florbal"), friends: [libor] }],
      total: 2,
      nextOffset: 10,
    })
    answer({
      items: [{ event: anEvent("e2", "Badminton Strahov"), friends: [] }],
      total: 2,
      nextOffset: null,
    })
    await withQueries(
      <FriendsEvents
        viewerId="me"
        activityLabel={(activity) => activity.name}
        now={NOW}
      />,
    )

    const list = await screen.findByRole("list", { name: "Akce přátel" })
    expect(within(list).getByRole("link", { name: /Čtvrteční florbal/ })).toHaveAttribute(
      "href",
      "/events/e1",
    )
    expect(within(list).getByText(/Z vašich přátel jde/)).toHaveTextContent(
      "Z vašich přátel jde Libor",
    )
    expect(get).toHaveBeenCalledWith("friends/events", { searchParams: {} })

    await userEvent.click(screen.getByRole("button", { name: "Načíst další" }))

    expect(await screen.findByRole("link", { name: /Badminton Strahov/ })).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("friends/events", { searchParams: { offset: 10 } })
    expect(screen.queryByRole("button", { name: "Načíst další" })).toBeNull()
  })

  it("says when friends go nowhere", async () => {
    answer({ items: [], total: 0, nextOffset: null })
    await withQueries(
      <FriendsEvents
        viewerId="me"
        activityLabel={(activity) => activity.name}
      />,
    )

    expect(await screen.findByText(/Vaši přátelé zatím nikam nejdou/)).toBeInTheDocument()
  })
})

describe("FriendsEventsPreview (#226)", () => {
  beforeEach(() => get.mockReset())

  it("shows the three nearest and leads to the rest", async () => {
    answer({
      items: ["e1", "e2", "e3", "e4"].map((id) => ({
        event: anEvent(id, `Akce ${id}`),
        friends: [libor],
      })),
      total: 12,
      nextOffset: 10,
    })
    await withQueries(
      <FriendsEventsPreview
        viewerId="me"
        activityLabel={(activity) => activity.name}
        now={NOW}
      />,
    )

    const list = await screen.findByRole("list", { name: "Kam jdou přátelé" })
    expect(within(list).getAllByRole("link", { name: /Akce e/ })).toHaveLength(3)
    expect(screen.getByRole("link", { name: "Všechny akce přátel" })).toHaveAttribute(
      "href",
      "/friends?tab=events",
    )
  })

  it("is not there while nothing is planned", async () => {
    answer({ items: [], total: 0, nextOffset: null })
    await withQueries(
      <FriendsEventsPreview
        viewerId="me"
        activityLabel={(activity) => activity.name}
      />,
    )

    await vi.waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByRole("heading", { name: "Kam jdou přátelé" })).toBeNull()
  })
})

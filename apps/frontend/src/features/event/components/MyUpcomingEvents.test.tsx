import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { MyUpcomingEvents } from "@/features/event/components/MyUpcomingEvents"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

const NOW = new Date(2030, 0, 10, 12, 0)

const event = (id: string, title: string, day: number) => ({
  id,
  title,
  imageUrl: null,
  startAt: new Date(2030, 0, day, 18, 0).toISOString(),
  endAt: new Date(2030, 0, day, 20, 0).toISOString(),
  venueType: "PUBLIC_VENUE",
  placeName: null,
  district: null,
  city: "Praha",
  level: null,
  latitude: null,
  longitude: null,
  distanceKm: null,
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 8,
  maxParticipants: 10,
  takenCount: 7,
  organizerName: "Jana Nováková",
  group: null,
  contributionAmount: null,
})

const respond = (applications: unknown[], hosted: unknown[]) =>
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path === "my-events/applications"
          ? { items: applications, total: applications.length, nextOffset: null }
          : { items: hosted, total: hosted.length },
      ),
  }))

const renderPanel = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MyUpcomingEvents
        userId="u1"
        now={NOW}
      />
    </QueryClientProvider>,
  )

beforeEach(() => get.mockReset())

describe("MyUpcomingEvents", () => {
  it("lists the events ahead with a seat or organized, soonest first", async () => {
    respond(
      [
        { status: "APPROVED", canRateOrganizer: false, event: event("e2", "Volejbal", 14) },
        { status: "PENDING", canRateOrganizer: false, event: event("e3", "Čeká na schválení", 12) },
        { status: "APPROVED", canRateOrganizer: false, event: event("e4", "Už proběhlo", 2) },
      ],
      // The hosted list says whether an administrator hid the event (#239).
      [{ ...event("e1", "Můj florbal", 11), isHidden: false }],
    )
    await renderPanel()

    const items = await screen.findAllByRole("listitem")
    expect(items.map((item) => within(item).getByRole("link").textContent)).toEqual([
      expect.stringContaining("Můj florbal"),
      expect.stringContaining("Volejbal"),
    ])
    expect(items[0]).toHaveTextContent("Pořádáte")
    expect(screen.getByRole("link", { name: "Všechny moje akce" })).toHaveAttribute(
      "href",
      "/my-events",
    )
  })

  it("says there is nothing ahead and where to find something", async () => {
    respond(
      [{ status: "APPROVED", canRateOrganizer: false, event: event("e4", "Už proběhlo", 2) }],
      [],
    )
    await renderPanel()

    expect(await screen.findByText("Zatím nikam nejdete a nic nepořádáte.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Najít akci" })).toHaveAttribute("href", "/events")
  })

  it("says when the events could not be loaded and lets them be retried", async () => {
    get.mockImplementation(() => ({ json: () => Promise.reject(new Error("down")) }))
    await renderPanel()

    expect(await screen.findByText("Akce se nepodařilo načíst.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
  })
})

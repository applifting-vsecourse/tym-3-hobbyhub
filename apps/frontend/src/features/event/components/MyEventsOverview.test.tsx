import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import type { MyApplication } from "@/features/event/api/myEventsSchemas"
import { MyEventsOverview, type MyEventsList } from "@/features/event/components/MyEventsOverview"

// Rows link to the detail; the router itself is not under test here.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params?: { eventId: string }
    children: React.ReactNode
    className?: string
  }) => (
    <a
      href={params ? `/events/${params.eventId}` : to}
      {...props}
    >
      {children}
    </a>
  ),
}))

const NOW = new Date(2026, 9, 22, 8, 0)

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
  level: null,
  latitude: null,
  longitude: null,
  distanceKm: null,
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 8,
  maxParticipants: 10,
  takenCount: 7,
  ...overrides,
})

const list = <T,>(items: T[], overrides: Partial<MyEventsList<T>> = {}): MyEventsList<T> => ({
  items,
  total: items.length,
  isLoading: false,
  error: null,
  hasMore: false,
  isLoadingMore: false,
  onLoadMore: vi.fn(),
  onReload: vi.fn(),
  onRetry: vi.fn(),
  ...overrides,
})

const renderOverview = (
  applications: MyEventsList<MyApplication> = list([]),
  hosted: MyEventsList<EventListItem> = list([]),
) =>
  render(
    <MyEventsOverview
      applications={applications}
      hosted={hosted}
      activityLabel={(activity) => activity.name}
      now={NOW}
    />,
  )

describe("MyEventsOverview", () => {
  it("shows every application with its state and links to the event", () => {
    renderOverview(
      list([
        { status: "PENDING", event: event({ id: "e1", title: "Florbal" }) },
        { status: "APPROVED", event: event({ id: "e2", title: "Deskovky" }) },
        { status: "REJECTED", event: event({ id: "e3", title: "Squash" }) },
        { status: "WITHDRAWN", event: event({ id: "e4", title: "Plavání" }) },
        { status: "EVENT_CANCELLED", event: event({ id: "e5", title: "Šachy" }) },
      ]),
    )

    const applications = screen.getByRole("tabpanel")
    expect(within(applications).getAllByRole("link")).toHaveLength(5)
    for (const label of [
      "Čeká na schválení",
      "Schváleno",
      "Zamítnuto",
      "Odhlášeno",
      "Akce zrušena",
    ]) {
      expect(within(applications).getByText(label)).toBeInTheDocument()
    }
    expect(within(applications).getByRole("link", { name: /Deskovky/ })).toHaveAttribute(
      "href",
      "/events/e2",
    )
  })

  it("shows the totals in the tabs, not the number of loaded rows", () => {
    renderOverview(
      list([{ status: "PENDING", event: event() }], { total: 45, hasMore: true }),
      list([event({ id: "h1" })], { total: 12 }),
    )

    expect(screen.getByRole("tab", { name: "Přihlášky (45)" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Pořádám (12)" })).toBeInTheDocument()
  })

  it("lists hosted events in their own tab without an application state", async () => {
    renderOverview(list([]), list([event({ id: "h1", title: "Moje akce" })]))

    await userEvent.click(screen.getByRole("tab", { name: /Pořádám/ }))
    const hosted = screen.getByRole("tabpanel")
    expect(within(hosted).getByRole("link", { name: /Moje akce/ })).toHaveAttribute(
      "href",
      "/events/h1",
    )
    expect(screen.queryByText("Schváleno")).not.toBeInTheDocument()
  })

  it("says so in a tab that has nothing", async () => {
    renderOverview(list([{ status: "PENDING", event: event() }]), list([]))

    await userEvent.click(screen.getByRole("tab", { name: /Pořádám/ }))
    expect(screen.getByText("Nepořádáte žádnou nadcházející akci.")).toBeInTheDocument()
  })

  it("offers to find an event when there is nothing at all", () => {
    renderOverview()

    expect(screen.getByText("Zatím tu nic není")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Najít akci" })).toHaveAttribute("href", "/events")
  })

  it("loads the next page on request and keeps the rows loaded", async () => {
    const onLoadMore = vi.fn()
    renderOverview(
      list([{ status: "PENDING", event: event({ title: "Florbal" }) }], {
        total: 30,
        hasMore: true,
        onLoadMore,
      }),
    )

    await userEvent.click(screen.getByRole("button", { name: "Načíst další" }))

    expect(onLoadMore).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: /Florbal/ })).toBeInTheDocument()
  })

  it("hides the button on the last page", () => {
    renderOverview(list([{ status: "PENDING", event: event() }], { hasMore: false }))

    expect(screen.queryByRole("button", { name: "Načíst další" })).not.toBeInTheDocument()
  })

  it("keeps the rows when a later page or a reload fails, and retries that", async () => {
    const onRetry = vi.fn()
    renderOverview(
      list([{ status: "PENDING", event: event({ title: "Florbal" }) }], {
        error: new Error("boom"),
        hasMore: true,
        onRetry,
      }),
    )

    expect(screen.getByRole("link", { name: /Florbal/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /znovu|Zkusit/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("shows the error of a list that failed on its first load and reloads it", async () => {
    const onReload = vi.fn()
    renderOverview(list([], { error: new Error("boom"), onReload }), list([event()], { total: 1 }))

    await userEvent.click(screen.getByRole("button", { name: /znovu|Zkusit/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })
})

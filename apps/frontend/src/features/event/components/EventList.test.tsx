import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { EventList } from "@/features/event/components/EventList"

// Rows link to the detail; the router itself is not under test here.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    params,
    children,
    ...props
  }: {
    params: { eventId: string }
    children: React.ReactNode
    className?: string
  }) => (
    <a
      href={`/events/${params.eventId}`}
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
  level: "Pokročilí",
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 8,
  maxParticipants: 10,
  takenCount: 7,
  ...overrides,
})

describe("EventList", () => {
  it("shows day, time, activity, title, approximate place and missing seats in a row", () => {
    render(
      <EventList
        activityLabel={(activity) => activity.name}
        events={[event()]}
        total={1}
        now={NOW}
      />,
    )

    expect(screen.getByRole("heading", { name: "Dnes" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Čtvrteční florbal" })).toBeInTheDocument()
    expect(screen.getByText("19:00")).toBeInTheDocument()
    expect(screen.getByText("Florbal · ZŠ Kobylisy, Praha 8 · Pokročilí")).toBeInTheDocument()
    expect(screen.getByText("1 akce")).toBeInTheDocument()
    // Missing counts towards the minimum (8), not the capacity (10).
    expect(screen.getByText("chybí 1")).toBeInTheDocument()
  })

  it("links a row to the event detail", () => {
    render(
      <EventList
        events={[event()]}
        total={1}
        activityLabel={(activity) => activity.name}
        now={NOW}
      />,
    )

    expect(screen.getByRole("link", { name: /Čtvrteční florbal/ })).toHaveAttribute(
      "href",
      "/events/e1",
    )
  })

  it("says full once the minimum is reached", () => {
    render(
      <EventList
        activityLabel={(activity) => activity.name}
        events={[event({ takenCount: 8 })]}
        total={1}
        now={NOW}
      />,
    )

    expect(screen.getByText("naplněno")).toBeInTheDocument()
    expect(screen.queryByText(/^chybí/)).not.toBeInTheDocument()
  })

  it("shows the total and loads more on request", async () => {
    const onLoadMore = vi.fn()
    render(
      <EventList
        events={[event()]}
        total={45}
        hasMore
        onLoadMore={onLoadMore}
        activityLabel={(activity) => activity.name}
        now={NOW}
      />,
    )

    expect(screen.getByText("45 akcí")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Načíst další" }))
    expect(onLoadMore).toHaveBeenCalled()
  })

  it("keeps the loaded events when a later page fails", async () => {
    const onLoadMore = vi.fn()
    render(
      <EventList
        events={[event()]}
        total={45}
        hasMore
        error={new Error("Network down")}
        onLoadMore={onLoadMore}
        activityLabel={(activity) => activity.name}
        now={NOW}
      />,
    )

    expect(screen.getByRole("heading", { name: "Čtvrteční florbal" })).toBeInTheDocument()
    expect(screen.getByText("Network down")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Načíst znovu" }))
    expect(onLoadMore).toHaveBeenCalled()
  })

  it("explains an empty list", () => {
    render(
      <EventList
        events={[]}
        total={0}
        activityLabel={(activity) => activity.name}
      />,
    )

    expect(screen.getByText(/nejsou žádné nadcházející akce/)).toBeInTheDocument()
  })

  it("says nothing matches when a filter is on, and lets the filters go", async () => {
    const onClearFilters = vi.fn()
    render(
      <EventList
        events={[]}
        total={0}
        activityLabel={(activity) => activity.name}
        isFiltered
        onClearFilters={onClearFilters}
      />,
    )

    expect(screen.getByRole("heading", { name: "Nic nenalezeno" })).toBeInTheDocument()
    expect(screen.queryByText(/nejsou žádné nadcházející akce/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Vymazat filtry" }))
    expect(onClearFilters).toHaveBeenCalled()
  })

  it("offers a reload when loading fails", async () => {
    const onReload = vi.fn()
    render(
      <EventList
        activityLabel={(activity) => activity.name}
        events={[]}
        total={0}
        error={new Error("Network down")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Network down")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Načíst znovu" }))
    expect(onReload).toHaveBeenCalled()
  })
})

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { UpcomingEvents } from "@/features/event/components/UpcomingEvents"

// Cards link to the detail; the router itself is not under test here.
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
  imageUrl: "https://example.com/florbal.jpg",
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

describe("UpcomingEvents", () => {
  it("shows a card per event that opens the detail", () => {
    render(
      <UpcomingEvents
        activityLabel={(activity) => activity.name}
        events={[
          event(),
          event({
            id: "e2",
            title: "Deskovky v herně",
            imageUrl: null,
            startAt: new Date(2026, 9, 23, 18, 0),
          }),
        ]}
        now={NOW}
      />,
    )

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "/events/e1")
    expect(links[1]).toHaveAttribute("href", "/events/e2")
    expect(screen.getByRole("heading", { name: "Čtvrteční florbal" })).toBeInTheDocument()
    expect(screen.getByText("Dnes 19:00")).toBeInTheDocument()
    expect(screen.getByText("Zítra 18:00")).toBeInTheDocument()
    expect(screen.getAllByText("Florbal · ZŠ Kobylisy, Praha 8 · Pokročilí")).toHaveLength(2)
    expect(screen.getAllByText("chybí 3")).toHaveLength(2)
  })

  it("shows the photo only where there is one", () => {
    render(
      <UpcomingEvents
        activityLabel={(activity) => activity.name}
        events={[event(), event({ id: "e2", title: "Deskovky v herně", imageUrl: null })]}
        now={NOW}
      />,
    )

    expect(document.querySelectorAll('img[src="https://example.com/florbal.jpg"]')).toHaveLength(1)
  })

  it("says what would appear here when there are no events", () => {
    render(
      <UpcomingEvents
        activityLabel={(activity) => activity.name}
        events={[]}
        now={NOW}
      />,
    )

    expect(screen.getByText(/zatím/i)).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("shows the loader while loading", () => {
    render(
      <UpcomingEvents
        activityLabel={(activity) => activity.name}
        events={[]}
        isLoading
        now={NOW}
      />,
    )

    // The loader's text appears after its delay; its live region is there at once.
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("keeps the cards when a refetch in the background fails", () => {
    render(
      <UpcomingEvents
        activityLabel={(activity) => activity.name}
        events={[event()]}
        error={new Error("Server je mimo")}
        now={NOW}
      />,
    )

    expect(screen.getByRole("link")).toHaveAttribute("href", "/events/e1")
    expect(screen.queryByText("Server je mimo")).not.toBeInTheDocument()
  })

  it("shows the error with a way to retry", async () => {
    const onReload = vi.fn()
    render(
      <UpcomingEvents
        activityLabel={(activity) => activity.name}
        events={[]}
        error={new Error("Server je mimo")}
        onReload={onReload}
        now={NOW}
      />,
    )

    expect(screen.getByText("Server je mimo")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Načíst znovu" }))
    expect(onReload).toHaveBeenCalledOnce()
  })
})

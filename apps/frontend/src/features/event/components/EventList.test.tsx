import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { EventList } from "@/features/event/components/EventList"

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
  it("shows activity, title, date and time, approximate place and missing seats on a card", () => {
    render(
      <EventList
        activityLabel={(activity) => activity.name}
        events={[event()]}
        now={NOW}
      />,
    )

    expect(screen.getByText("Florbal")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Čtvrteční florbal" })).toBeInTheDocument()
    expect(screen.getByText("Dnes 19:00")).toBeInTheDocument()
    expect(screen.getByText("ZŠ Kobylisy, Praha 8 · Pokročilí")).toBeInTheDocument()
    // Missing counts towards the minimum (8), not the capacity (10).
    expect(screen.getByText("chybí 1")).toBeInTheDocument()
  })

  it("says full once the minimum is reached", () => {
    render(
      <EventList
        activityLabel={(activity) => activity.name}
        events={[event({ takenCount: 8 })]}
        now={NOW}
      />,
    )

    expect(screen.getByText("naplněno")).toBeInTheDocument()
    expect(screen.queryByText(/^chybí/)).not.toBeInTheDocument()
  })

  it("explains an empty list", () => {
    render(
      <EventList
        events={[]}
        activityLabel={(activity) => activity.name}
      />,
    )

    expect(screen.getByText(/nejsou žádné nadcházející akce/)).toBeInTheDocument()
  })

  it("offers a reload when loading fails", async () => {
    const onReload = vi.fn()
    render(
      <EventList
        activityLabel={(activity) => activity.name}
        events={[]}
        error={new Error("Network down")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Network down")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Načíst znovu" }))
    expect(onReload).toHaveBeenCalled()
  })
})

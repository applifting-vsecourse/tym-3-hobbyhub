import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { SelectedEventCard } from "@/features/event/components/SelectedEventCard"

const event: EventListItem = {
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
  latitude: 50.1297,
  longitude: 14.4421,
  distanceKm: null,
  activity: { id: "a1", name: "Florbal", icon: "florbal" },
  minParticipants: 8,
  maxParticipants: 10,
  takenCount: 7,
}

const NOW = new Date(2026, 9, 22, 12, 0)

describe("SelectedEventCard", () => {
  it("shows the event as a card that opens its detail", async () => {
    await renderWithRouter(
      <SelectedEventCard
        event={event}
        activityLabel="Florbal"
        onClose={vi.fn()}
        now={NOW}
      />,
    )

    expect(screen.getByRole("link", { name: "Detail akce Čtvrteční florbal" })).toHaveAttribute(
      "href",
      "/events/e1",
    )
    expect(screen.getByText("Florbal · ZŠ Kobylisy, Praha 8 · Pokročilí")).toBeInTheDocument()
    expect(screen.getByText("Dnes 19:00")).toBeInTheDocument()
    expect(screen.getByText("chybí 1")).toBeInTheDocument()
  })

  it("closes without opening the detail", async () => {
    const onClose = vi.fn()
    await renderWithRouter(
      <SelectedEventCard
        event={event}
        activityLabel="Florbal"
        onClose={onClose}
        now={NOW}
      />,
    )

    await userEvent.setup().click(screen.getByRole("button", { name: "Zavřít náhled" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

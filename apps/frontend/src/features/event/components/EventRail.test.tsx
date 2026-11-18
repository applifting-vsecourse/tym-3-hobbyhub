import { screen } from "@testing-library/react"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import { EventRail } from "@/features/event/components/EventRail"

const anEvent = (id: string, title: string): EventListItem => ({
  id,
  title,
  imageUrl: null,
  startAt: new Date(2030, 0, 3, 19, 0),
  endAt: new Date(2030, 0, 3, 21, 0),
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
  organizerName: "Jana",
  group: null,
  contributionAmount: null,
})

const renderRail = (props: Partial<Parameters<typeof EventRail>[0]> = {}) =>
  renderWithRouter(
    <EventRail
      id="friends"
      title="Kam chodí přátelé"
      events={[]}
      activityLabel={(activity) => activity.name}
      {...props}
    />,
  )

describe("EventRail", () => {
  it("shows the events of a row, each opening its detail", async () => {
    await renderRail({ events: [anEvent("e1", "Florbal"), anEvent("e2", "Volejbal")] })

    const section = screen.getByRole("region", { name: "Kam chodí přátelé" })
    expect(section).toBeInTheDocument()
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/events/e1",
      "/events/e2",
    ])
  })

  it("leads to the whole list when it has one", async () => {
    await renderRail({
      events: [anEvent("e1", "Florbal")],
      seeAll: { search: { location: "Praha" } },
    })

    expect(screen.getByRole("link", { name: "Všechny akce" })).toHaveAttribute(
      "href",
      "/events?location=Praha",
    )
  })

  it("says what it is missing instead of cards", async () => {
    await renderRail({ empty: "Zatím nikdo z vašich přátel nemá na žádné akci místo." })

    expect(screen.getByText(/nikdo z vašich přátel/)).toBeVisible()
    expect(screen.queryByRole("link", { name: "Všechny akce" })).not.toBeInTheDocument()
  })
})

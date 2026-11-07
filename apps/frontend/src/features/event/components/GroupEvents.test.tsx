import type { ComponentProps } from "react"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { GroupEvent } from "@/features/event/api/eventSchemas"
import { GroupEvents } from "@/features/event/components/GroupEvents"

const NOW = new Date(2026, 10, 6, 8, 0)

const anEvent = (overrides: Partial<GroupEvent> = {}): GroupEvent => ({
  id: "e1",
  title: "Čtvrteční florbal",
  imageUrl: null,
  startAt: new Date(2026, 10, 12, 19, 0),
  endAt: new Date(2026, 10, 12, 21, 0),
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
  maxParticipants: 12,
  takenCount: 4,
  status: "PUBLISHED",
  visibility: "PUBLIC",
  ...overrides,
})

const renderEvents = (props: Partial<ComponentProps<typeof GroupEvents>> = {}) =>
  renderWithRouter(
    <GroupEvents
      groupId="g1"
      period="upcoming"
      isMember={false}
      events={[anEvent()]}
      total={1}
      activityLabel={(activity) => activity.name}
      isLoading={false}
      error={null}
      onReload={vi.fn()}
      hasMore={false}
      isLoadingMore={false}
      onLoadMore={vi.fn()}
      now={NOW}
      {...props}
    />,
  )

describe("GroupEvents", () => {
  it("lists the events, each opening its detail", async () => {
    await renderEvents()

    const section = screen.getByRole("region", { name: "Akce skupiny" })
    const link = within(section).getByRole("link", { name: /Čtvrteční florbal/ })
    expect(link).toHaveAttribute("href", "/events/e1")
    expect(within(section).getByText("1 nadcházející akce")).toBeVisible()
  })

  it("gives a non-member no switch to the past", async () => {
    await renderEvents()

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()
  })

  it("gives a member the switch, with the period in the URL", async () => {
    await renderEvents({ isMember: true, period: "past" })

    const periods = screen.getByRole("navigation", { name: "Nadcházející a minulé akce" })
    expect(within(periods).getByRole("link", { name: "Nadcházející" })).toHaveAttribute(
      "href",
      "/groups/g1",
    )
    const past = within(periods).getByRole("link", { name: "Minulé" })
    expect(past).toHaveAttribute("href", "/groups/g1?events=past")
    expect(past).toHaveAttribute("aria-current", "page")
  })

  it("marks cancelled and group-only events", async () => {
    await renderEvents({
      events: [
        anEvent({ id: "e1", title: "Turnaj", status: "CANCELLED" }),
        anEvent({ id: "e2", title: "Trénink", visibility: "GROUP_ONLY" }),
        anEvent({ id: "e3", title: "Zápas" }),
      ],
      total: 3,
    })

    const [cancelled, groupOnly, plain] = screen.getAllByRole("listitem")
    expect(within(cancelled!).getByText("Zrušeno")).toBeVisible()
    expect(within(groupOnly!).getByText("Jen pro skupinu")).toBeVisible()
    expect(within(plain!).queryByText(/Zrušeno|Jen pro skupinu/)).not.toBeInTheDocument()
  })

  it.each([
    ["upcoming", "Skupina teď nemá žádné nadcházející akce."],
    ["past", "Skupina zatím nemá žádné minulé akce."],
  ] as const)("says when there are no %s events", async (period, text) => {
    await renderEvents({ period, isMember: true, events: [], total: 0 })

    expect(screen.getByText(text)).toBeVisible()
  })

  it("offers a retry when the first load fails", async () => {
    const onReload = vi.fn()
    const user = userEvent.setup()
    await renderEvents({ events: [], total: 0, error: new Error("nope"), onReload })

    await user.click(screen.getByRole("button", { name: "Načíst znovu" }))
    expect(onReload).toHaveBeenCalled()
  })

  it("loads the next page on request", async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    await renderEvents({ total: 15, hasMore: true, onLoadMore })

    await user.click(screen.getByRole("button", { name: "Načíst další" }))
    expect(onLoadMore).toHaveBeenCalled()
  })
})

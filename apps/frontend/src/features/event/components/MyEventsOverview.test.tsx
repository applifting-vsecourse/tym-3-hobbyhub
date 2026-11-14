import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { EventListItem } from "@/features/event/api/eventSchemas"
import type { MyApplication } from "@/features/event/api/myEventsSchemas"
import {
  MyEventsOverview,
  type ApplicationAction,
  type MyEventsList,
  type MyEventsTab,
} from "@/features/event/components/MyEventsOverview"

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

type Options = {
  tab?: MyEventsTab
  isFiltered?: boolean
  onClearFilters?: () => void
  onApplicationAction?: (action: ApplicationAction, application: MyApplication) => void
}

// Through a router: the tabs and the rows are links.
const renderOverview = (
  applications: MyEventsList<MyApplication> = list([]),
  hosted: MyEventsList<EventListItem> = list([]),
  { tab = "applications", isFiltered = false, onClearFilters, onApplicationAction }: Options = {},
) =>
  renderWithRouter(
    <MyEventsOverview
      applications={applications}
      hosted={hosted}
      tab={tab}
      isFiltered={isFiltered}
      onClearFilters={onClearFilters}
      filters={<p>filters-slot</p>}
      activityLabel={(activity) => activity.name}
      onApplicationAction={onApplicationAction}
      now={NOW}
    />,
  )

describe("MyEventsOverview", () => {
  it("shows every application with its state and links to the event", async () => {
    await renderOverview(
      list([
        { status: "PENDING", event: event({ id: "e1", title: "Florbal" }) },
        { status: "APPROVED", event: event({ id: "e2", title: "Deskovky" }) },
        { status: "REJECTED", event: event({ id: "e3", title: "Squash" }) },
        { status: "WITHDRAWN", event: event({ id: "e4", title: "Plavání" }) },
        { status: "EVENT_CANCELLED", event: event({ id: "e5", title: "Šachy" }) },
      ]),
    )

    const applications = screen.getByRole("list")
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

  it("shows the totals in the tabs, not the number of loaded rows", async () => {
    await renderOverview(
      list([{ status: "PENDING", event: event() }], { total: 45, hasMore: true }),
      list([event({ id: "h1" })], { total: 12 }),
    )

    expect(screen.getByRole("link", { name: "Přihlášky (45)" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pořádám (12)" })).toBeInTheDocument()
  })

  // #177: the tab lives in the URL, so a link can open either one.
  it("links the tabs to their URL and marks the one on screen", async () => {
    await renderOverview(list([{ status: "PENDING", event: event() }]), list([event()]))

    const tabs = screen.getByRole("navigation", { name: "Moje akce" })
    const applications = within(tabs).getByRole("link", { name: /Přihlášky/ })
    const hosted = within(tabs).getByRole("link", { name: /Pořádám/ })
    expect(applications).toHaveAttribute("href", "/my-events")
    expect(applications).toHaveAttribute("aria-current", "page")
    expect(hosted).toHaveAttribute("href", "/my-events?tab=hosted")
    expect(hosted).not.toHaveAttribute("aria-current")
  })

  it("lists hosted events in their own tab without an application state", async () => {
    await renderOverview(
      list([{ status: "APPROVED", event: event({ id: "e1", title: "Cizí akce" }) }]),
      list([event({ id: "h1", title: "Moje akce" })]),
      { tab: "hosted" },
    )

    expect(screen.getByRole("link", { name: /Pořádám/ })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: /Moje akce/ })).toHaveAttribute("href", "/events/h1")
    expect(screen.queryByRole("link", { name: /Cizí akce/ })).not.toBeInTheDocument()
    expect(screen.queryByText("Schváleno")).not.toBeInTheDocument()
  })

  // #239: the organizer still has the event an administrator hid.
  it("marks a hosted event an administrator hid", async () => {
    await renderOverview(
      list([]),
      list([
        { ...event({ id: "h1", title: "Skrytá" }), isHidden: true },
        { ...event({ id: "h2", title: "Viditelná" }), isHidden: false },
      ]),
      { tab: "hosted" },
    )

    expect(screen.getByRole("link", { name: /Skrytá/ })).toHaveTextContent("Skrytá správcem")
    expect(screen.getByRole("link", { name: /Viditelná/ })).not.toHaveTextContent("Skrytá správcem")
  })

  it("says so in a tab that has nothing", async () => {
    await renderOverview(list([{ status: "PENDING", event: event() }]), list([]), {
      tab: "hosted",
    })

    expect(screen.getByText("Zatím nepořádáte žádnou akci.")).toBeInTheDocument()
  })

  it("shows the filters with the tabs", async () => {
    await renderOverview(list([{ status: "PENDING", event: event() }]))

    expect(screen.getByText("filters-slot")).toBeInTheDocument()
  })

  it("says nothing matches a filter and offers to clear it", async () => {
    const onClearFilters = vi.fn()
    await renderOverview(list([]), list([]), { isFiltered: true, onClearFilters })

    // Not "nothing yet": the tabs and the filters stay, so the filter can change.
    expect(screen.queryByText("Zatím tu nic není")).not.toBeInTheDocument()
    expect(screen.getByText("filters-slot")).toBeInTheDocument()
    expect(screen.getByText("Nic nenalezeno")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Vymazat filtry" }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it("marks the rows of the previous filter while the new ones load", async () => {
    await renderOverview(list([{ status: "PENDING", event: event() }], { isStale: true }))

    expect(screen.getByRole("list").parentElement?.parentElement).toHaveAttribute(
      "aria-busy",
      "true",
    )
  })

  it("offers to find an event when there is nothing at all", async () => {
    await renderOverview()

    expect(screen.getByText("Zatím tu nic není")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Najít akci" })).toHaveAttribute("href", "/events")
  })

  it("loads the next page on request and keeps the rows loaded", async () => {
    const onLoadMore = vi.fn()
    await renderOverview(
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

  it("hides the button on the last page", async () => {
    await renderOverview(list([{ status: "PENDING", event: event() }], { hasMore: false }))

    expect(screen.queryByRole("button", { name: "Načíst další" })).not.toBeInTheDocument()
  })

  it("keeps the rows when a later page or a reload fails, and retries that", async () => {
    const onRetry = vi.fn()
    await renderOverview(
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

  // #171: the way out of an application, right from the overview.
  describe("the row's menu", () => {
    const started = event({
      startAt: new Date(2026, 9, 22, 7, 0),
      endAt: new Date(2026, 9, 22, 9, 0),
    })

    it("offers to withdraw a waiting request and to cancel a seat", async () => {
      const onApplicationAction = vi.fn()
      const waiting = { status: "PENDING", event: event({ id: "e1", title: "Florbal" }) } as const
      const seated = { status: "APPROVED", event: event({ id: "e2", title: "Deskovky" }) } as const
      await renderOverview(list([waiting, seated]), list([]), { onApplicationAction })

      await userEvent.click(screen.getByRole("button", { name: "Možnosti přihlášky: Florbal" }))
      await userEvent.click(await screen.findByRole("menuitem", { name: "Zrušit žádost" }))
      expect(onApplicationAction).toHaveBeenLastCalledWith("withdraw", waiting)

      await userEvent.click(screen.getByRole("button", { name: "Možnosti přihlášky: Deskovky" }))
      await userEvent.click(await screen.findByRole("menuitem", { name: "Zrušit účast" }))
      expect(onApplicationAction).toHaveBeenLastCalledWith("cancel", seated)

      // The row itself still leads to the detail.
      expect(screen.getByRole("link", { name: /Deskovky/ })).toHaveAttribute("href", "/events/e2")
    })

    it.each([
      ["a rejected request", { status: "REJECTED", event: event() }],
      ["a seat given back", { status: "WITHDRAWN", event: event() }],
      ["a cancelled event", { status: "EVENT_CANCELLED", event: event() }],
      ["a seat on an event that started", { status: "APPROVED", event: started }],
      ["a request on an event that started", { status: "PENDING", event: started }],
    ] as const)("has nothing for %s", async (_, application) => {
      await renderOverview(list([application]), list([]), { onApplicationAction: vi.fn() })

      expect(screen.queryByRole("button", { name: /Možnosti přihlášky/ })).not.toBeInTheDocument()
    })

    it("goes away once the event starts on a page left open", async () => {
      // Only the clock and the minute tick are fake, so the router still loads.
      vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] })
      try {
        const startAt = new Date(2026, 9, 22, 19, 0)
        vi.setSystemTime(new Date(startAt.getTime() - 30_000))
        await renderWithRouter(
          <MyEventsOverview
            applications={list([{ status: "APPROVED", event: event({ startAt }) }])}
            hosted={list([])}
            tab="applications"
            activityLabel={(activity) => activity.name}
            onApplicationAction={vi.fn()}
          />,
        )
        expect(screen.getByRole("button", { name: /Možnosti přihlášky/ })).toBeInTheDocument()

        act(() => {
          vi.advanceTimersByTime(60_000)
        })

        expect(screen.queryByRole("button", { name: /Možnosti přihlášky/ })).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })

    it("is not there when the page offers no action", async () => {
      await renderOverview(list([{ status: "APPROVED", event: event() }]))

      expect(screen.queryByRole("button", { name: /Možnosti přihlášky/ })).not.toBeInTheDocument()
    })
  })

  it("shows the error of a list that failed on its first load and reloads it", async () => {
    const onReload = vi.fn()
    await renderOverview(
      list([], { error: new Error("boom"), onReload }),
      list([event()], { total: 1 }),
    )

    await userEvent.click(screen.getByRole("button", { name: /znovu|Zkusit/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })
})

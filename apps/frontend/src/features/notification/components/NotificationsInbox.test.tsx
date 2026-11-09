import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { NotificationKind } from "@/features/notification/api/notificationSchemas"
import { NotificationsInbox } from "@/features/notification/components/NotificationsInbox"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get, post },
}))

const now = new Date("2030-01-01T12:00:00.000Z")

const aNotification = (id: string, title: string, readAt: string | null = null) => ({
  id,
  type: "EVENT_CANCELLED",
  createdAt: "2030-01-01T11:55:00.000Z",
  readAt,
  actor: { id: "u2", name: "Honza_K" },
  event: { id: "e1", title },
  group: null,
  decision: null,
  message: null,
  changes: [],
})

type Options = { searchParams?: Record<string, string> }

// The server, held in memory: the unread and the read ones, filtered the
// way the page asks for them. ky's `get()` has `.json()` on the promise.
const server = (state: { unread: unknown[]; read: unknown[] }) => {
  get.mockImplementation((path: string, options?: Options) => ({
    json: () => {
      if (path === "notifications/unread-count") {
        return Promise.resolve({ count: state.unread.length })
      }
      const items = options?.searchParams?.read === "true" ? state.read : state.unread
      return Promise.resolve({ items, total: items.length })
    },
  }))
  post.mockImplementation((path: string) => ({
    json: () => {
      if (path === "notifications/read-all") {
        const count = state.unread.length
        state.read = [...state.unread, ...state.read]
        state.unread = []
        return Promise.resolve({ count })
      }
      return Promise.reject(new Error(`unexpected ${path}`))
    },
  }))
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

const renderInbox = (kind?: NotificationKind) =>
  renderWithRouter(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <NotificationsInbox
        kind={kind}
        now={now}
      />
    </QueryClientProvider>,
  )

const section = async (name: RegExp) => screen.findByRole("region", { name })

// The page with its filter switched from outside, as a click on a chip does
// through the URL.
const renderSwitchableInbox = async () => {
  let switchKind: (kind: NotificationKind) => void = () => undefined
  function Switchable() {
    const [kind, setKind] = useState<NotificationKind | undefined>(undefined)
    switchKind = setKind
    return (
      <NotificationsInbox
        kind={kind}
        now={now}
      />
    )
  }
  await renderWithRouter(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <Switchable />
    </QueryClientProvider>,
  )
  return {
    switchTo: (kind: NotificationKind) =>
      act(async () => {
        switchKind(kind)
        await Promise.resolve()
      }),
  }
}

// Every kind answers with these, except the one in `groups`, which answers
// the way the test needs.
const serverByKind = (groups: () => Promise<unknown>) => {
  get.mockImplementation((path: string, options?: Options) => ({
    json: () => {
      if (path === "notifications/unread-count") return Promise.resolve({ count: 1 })
      if (options?.searchParams?.kind === "groups") return groups()
      const items =
        options?.searchParams?.read === "true"
          ? [aNotification("n3", "Šachy", "2030-01-01T11:58:00.000Z")]
          : [aNotification("n1", "Florbal")]
      return Promise.resolve({ items, total: items.length })
    },
  }))
}

describe("NotificationsInbox", () => {
  it("shows the new ones above the read ones, with how many are new", async () => {
    server({
      unread: [aNotification("n1", "Florbal"), aNotification("n2", "Volejbal")],
      read: [aNotification("n3", "Šachy", "2030-01-01T11:58:00.000Z")],
    })
    await renderInbox()

    expect(screen.getByRole("heading", { level: 1, name: "Notifikace" })).toBeInTheDocument()
    const fresh = await section(/^Nové/)
    const read = await section(/^Přečtené/)
    expect(within(fresh).getByRole("heading", { name: "Nové 2 nepřečtené" })).toBeInTheDocument()
    expect(within(fresh).getAllByRole("link")).toHaveLength(2)
    expect(within(fresh).getByRole("link", { name: /Florbal/ })).toBeInTheDocument()
    expect(within(read).getAllByRole("link")).toHaveLength(1)
    expect(within(read).getByRole("link", { name: /Šachy/ })).toBeInTheDocument()
    expect(fresh.compareDocumentPosition(read) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(get).toHaveBeenCalledWith("notifications", {
      searchParams: { limit: "10", offset: "0", read: "false" },
    })
    expect(get).toHaveBeenCalledWith("notifications", {
      searchParams: { limit: "10", offset: "0", read: "true" },
    })
  })

  it("gives each section its own empty state", async () => {
    server({ unread: [], read: [] })
    await renderInbox()

    expect(
      within(await section(/^Nové/)).getByText(/^Žádné nové notifikace\. Objeví se tu/),
    ).toBeInTheDocument()
    expect(
      within(await section(/^Přečtené/)).getByText(/^Zatím žádné přečtené notifikace/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Označit vše jako přečtené" }),
    ).not.toBeInTheDocument()
  })

  it("offers the kinds as links, the chosen one marked", async () => {
    server({ unread: [], read: [] })
    await renderInbox("events")

    const filter = screen.getByRole("navigation", { name: "Druh notifikací" })
    const chips = within(filter).getAllByRole("link")
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "Vše",
      "Přihlášky",
      "Akce",
      "Skupiny",
      "Ostatní",
    ])
    expect(within(filter).getByRole("link", { name: "Vše" })).toHaveAttribute(
      "href",
      "/notifications",
    )
    expect(within(filter).getByRole("link", { name: "Skupiny" })).toHaveAttribute(
      "href",
      "/notifications?kind=groups",
    )
    // `aria-current` comes from the router's own location, which in this
    // test is not the notification page; the chip's look follows the prop.
    expect(within(filter).getByRole("link", { name: "Akce" })).toHaveAttribute("data-state", "on")
    expect(within(filter).getByRole("link", { name: "Vše" })).toHaveAttribute("data-state", "off")
  })

  it("filters both sections by the chosen kind", async () => {
    server({ unread: [], read: [] })
    await renderInbox("events")

    expect(
      within(await section(/^Nové/)).getByText("Žádné nové notifikace tohoto druhu."),
    ).toBeInTheDocument()
    expect(
      within(await section(/^Přečtené/)).getByText("Žádné přečtené notifikace tohoto druhu."),
    ).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("notifications", {
      searchParams: { limit: "10", offset: "0", read: "false", kind: "events" },
    })
    expect(get).toHaveBeenCalledWith("notifications", {
      searchParams: { limit: "10", offset: "0", read: "true", kind: "events" },
    })
  })

  it("shows the loader, not the previous kind's rows, while another kind loads", async () => {
    serverByKind(() => new Promise(() => undefined))
    const { switchTo } = await renderSwitchableInbox()
    expect(
      within(await section(/^Nové/)).getByRole("link", { name: /Florbal/ }),
    ).toBeInTheDocument()

    await switchTo("groups")

    expect(await screen.findByText("Načítáme notifikace…")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Florbal/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Šachy/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("region", { name: /^Nové/ })).not.toBeInTheDocument()
  })

  it("shows the error when another kind fails to load", async () => {
    serverByKind(() => Promise.reject(new Error("down")))
    const { switchTo } = await renderSwitchableInbox()
    expect(
      within(await section(/^Nové/)).getByRole("link", { name: /Florbal/ }),
    ).toBeInTheDocument()

    await switchTo("groups")

    expect(
      within(await section(/^Nové/)).getByText("Notifikace se nepodařilo načíst"),
    ).toBeInTheDocument()
    expect(
      within(await section(/^Přečtené/)).getByText("Notifikace se nepodařilo načíst"),
    ).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Florbal/ })).not.toBeInTheDocument()
    expect(within(await section(/^Nové/)).queryByText("1")).not.toBeInTheDocument()
  })

  it("offers no marking read when the chosen kind has nothing new", async () => {
    // Unread ones of other kinds exist, the count on the bell says so.
    serverByKind(() => Promise.resolve({ items: [], total: 0 }))
    const { switchTo } = await renderSwitchableInbox()
    expect(
      await screen.findByRole("button", { name: "Označit vše jako přečtené" }),
    ).toBeInTheDocument()

    await switchTo("groups")

    expect(
      within(await section(/^Nové/)).getByText("Žádné nové notifikace tohoto druhu."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /přečtené/ })).not.toBeInTheDocument()
  })

  it("marks read only the chosen kind", async () => {
    server({ unread: [aNotification("n1", "Florbal")], read: [] })
    await renderInbox("events")

    await userEvent.click(await screen.findByRole("button", { name: "Označit tyto jako přečtené" }))

    expect(post).toHaveBeenCalledWith("notifications/read-all", {
      searchParams: { kind: "events" },
    })
  })

  it("moves everything to the read ones once all are marked read", async () => {
    server({ unread: [aNotification("n1", "Florbal")], read: [] })
    await renderInbox()

    await userEvent.click(await screen.findByRole("button", { name: "Označit vše jako přečtené" }))

    expect(post).toHaveBeenCalledWith("notifications/read-all")
    await waitFor(async () =>
      expect(
        within(await section(/^Přečtené/)).getByRole("link", { name: /Florbal/ }),
      ).toBeInTheDocument(),
    )
    expect(within(await section(/^Nové/)).getByText(/^Žádné nové notifikace/)).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Označit vše jako přečtené" }),
      ).not.toBeInTheDocument(),
    )
  })
})

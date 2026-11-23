import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import { beforeEach, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { FriendsSection } from "@/features/friendship/components/FriendsSection"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

// #228: the requests waiting for me: their number for the tab, the list on its tab.
const waiting = (count: number) =>
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path === "friends/requests/received/count"
          ? { count }
          : { items: [], total: count, nextOffset: null },
      ),
  }))

beforeEach(() => {
  get.mockReset()
  waiting(0)
})

const withQueries = (ui: ReactNode) =>
  renderWithRouter(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe("FriendsSection", () => {
  it("offers the four tabs in order, the friends first, each kept in the URL (#226)", async () => {
    await withQueries(<FriendsSection tab="friends" />)

    expect(screen.getByRole("heading", { level: 1, name: "Přátelé" })).toBeInTheDocument()
    const tabs = screen.getByRole("navigation", { name: "Části sekce Přátelé" })
    const links = Array.from(tabs.querySelectorAll("a"))
    expect(links.map((link) => link.textContent)).toEqual([
      "Přátelé",
      "Akce přátel",
      "Žádosti",
      "Vyhledat uživatele",
    ])
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/friends",
      "/friends?tab=events",
      "/friends?tab=requests",
      "/friends?tab=search",
    ])
    expect(links[0]).toHaveAttribute("aria-current", "page")
  })

  // #225: the search tab has the search, not an explanation.
  it("offers the search on its tab, without a link to itself", async () => {
    await withQueries(
      <FriendsSection
        tab="search"
        search={{ text: "", typed: "", onTypedChange: () => undefined }}
      />,
    )

    expect(
      screen.getByRole("searchbox", { name: "Hledat lidi podle přezdívky" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Vyhledat uživatele" })).toHaveLength(1)
  })

  it.each([
    ["friends", /Zatím tu nikoho nemáte/],
    ["requests", /Žádosti o přátelství, které vám lidé pošlou/],
  ] as const)("explains the empty %s tab and leads to the search", async (tab, text) => {
    await withQueries(<FriendsSection tab={tab} />)

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.queryByRole("searchbox")).toBeNull()
    const tabs = screen.getByRole("navigation", { name: "Části sekce Přátelé" })
    expect(tabs.querySelector('[aria-current="page"]')).toHaveTextContent(
      tab === "friends" ? "Přátelé" : "Žádosti",
    )
    // One link in the tabs, one under the explanation.
    const toSearch = screen.getAllByRole("link", { name: "Vyhledat uživatele" })
    expect(toSearch).toHaveLength(2)
    expect(toSearch[1]).toHaveAttribute("href", "/friends?tab=search")
  })

  it("shows on the tab how many requests wait (#228)", async () => {
    waiting(3)
    await withQueries(
      <FriendsSection
        tab="search"
        search={{ text: "", typed: "", onTypedChange: () => undefined }}
      />,
    )

    const tab = await screen.findByRole("link", { name: /Žádosti/ })
    expect(await screen.findByText("3 nevyřízené žádosti")).toBeInTheDocument()
    expect(tab).toHaveTextContent("Žádosti3")
    // Just the number: the list itself loads only on its own tab (review #257).
    expect(get).toHaveBeenCalledWith("friends/requests/received/count")
    expect(get).not.toHaveBeenCalledWith("friends/requests/received", expect.anything())
  })

  it("shows on the friends tab how many friends there are, without loading them (#226)", async () => {
    get.mockImplementation((path: string) => ({
      json: () => Promise.resolve(path === "friends/count" ? { count: 12 } : { count: 0 }),
    }))
    await withQueries(
      <FriendsSection
        tab="search"
        search={{ text: "", typed: "", onTypedChange: () => undefined }}
      />,
    )

    expect(await screen.findByText("12 přátel")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Přátelé/ })).toHaveTextContent("Přátelé12")
    expect(get).not.toHaveBeenCalledWith("friends", expect.anything())
  })

  it("shows more than 20 waiting requests as 20+ (#226)", async () => {
    waiting(21)
    await withQueries(<FriendsSection tab="friends" />)

    expect(await screen.findByText("21 nevyřízených žádostí")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Žádosti/ })).toHaveTextContent("Žádosti20+")
  })

  it("lists my friends with since when, the total and the order chips (#226)", async () => {
    get.mockImplementation((path: string) => ({
      json: () =>
        Promise.resolve(
          path === "friends"
            ? {
                items: [
                  {
                    id: "f1",
                    name: "Libor",
                    image: null,
                    friendsSince: "2026-11-14T10:00:00.000Z",
                  },
                ],
                total: 12,
                nextOffset: 20,
              }
            : { count: 0 },
        ),
    }))
    await withQueries(
      <FriendsSection
        tab="friends"
        sort="name_asc"
      />,
    )

    expect(await screen.findByRole("heading", { name: "Seznam vašich přátel" })).toBeInTheDocument()
    const list = screen.getByRole("list", { name: "Vaši přátelé" })
    expect(within(list).getByRole("link", { name: "Libor" })).toHaveAttribute("href", "/profile/f1")
    expect(within(list).getByText(/Přátelé od 14\. 11\. 2026/)).toBeInTheDocument()
    expect(
      within(list).getByRole("button", { name: "Odebrat z přátel: Libor" }),
    ).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("friends", { searchParams: { sort: "name_asc" } })
    const chips = within(screen.getByRole("navigation", { name: "Řazení přátel" })).getAllByRole(
      "link",
    )
    expect(chips.map((chip) => chip.textContent)).toEqual(["Nejnovější", "Nejstarší", "A–Z", "Z–A"])
    expect(chips[2]).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: "Načíst další" })).toBeInTheDocument()
  })

  it.each([
    ["friends", "náhled akcí", "všechny akce"],
    ["events", "všechny akce", "náhled akcí"],
  ] as const)(
    "puts the friends' events on the %s tab as the event feature gives them (#226)",
    async (tab, shown, hidden) => {
      await withQueries(
        <FriendsSection
          tab={tab}
          friendsEvents={{ preview: <p>náhled akcí</p>, list: <p>všechny akce</p> }}
        />,
      )

      expect(screen.getByText(shown)).toBeInTheDocument()
      expect(screen.queryByText(hidden)).toBeNull()
    },
  )
})

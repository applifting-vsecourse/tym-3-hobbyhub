import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { FriendSearchItem } from "@/features/friendship/api/friendshipSchemas"
import { FriendSearch } from "@/features/friendship/components/FriendSearch"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

const answer = (body: unknown) => get.mockReturnValueOnce({ json: () => Promise.resolve(body) })

const person = (overrides: Partial<FriendSearchItem>): FriendSearchItem => ({
  id: "u2",
  name: "Jana Nováková",
  image: null,
  relation: "none",
  ...overrides,
})

const renderSearch = (text: string, onTypedChange = vi.fn()) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <FriendSearch
        text={text}
        typed={text}
        onTypedChange={onTypedChange}
      />
    </QueryClientProvider>,
  )

describe("FriendSearch", () => {
  beforeEach(() => get.mockReset())

  it.each(["", "n"])("asks for 2 characters and searches nothing for %j", async (text) => {
    await renderSearch(text)

    expect(screen.getByText("Napište aspoň 2 znaky přezdívky.")).toBeInTheDocument()
    expect(screen.queryByText(/e-mail/)).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it("passes on what is typed into the field", async () => {
    const onTypedChange = vi.fn()
    await renderSearch("", onTypedChange)

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Hledat lidi podle přezdívky" }),
      "n",
    )

    expect(onTypedChange).toHaveBeenCalledWith("n")
  })

  it("shows each person as a card to their profile, with the nickname and my relation", async () => {
    answer({
      items: [
        person({ id: "u2", name: "janca_n" }),
        person({ id: "u3", name: "Petr Ivanov", relation: "request_sent" }),
        person({ id: "u4", name: "Libor Svoboda", relation: "request_received" }),
        person({ id: "u5", name: "Tereza Novotná", relation: "friends" }),
      ],
      nextOffset: null,
    })
    await renderSearch("nov")

    const list = await screen.findByRole("list", { name: "Nalezení lidé" })
    const links = within(list).getAllByRole("link")
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/profile/u2",
      "/profile/u3",
      "/profile/u4",
      "/profile/u5",
    ])
    expect(links[0]).toHaveTextContent("janca_n")
    expect(links[1]).toHaveTextContent("Žádost odeslána")
    expect(links[2]).toHaveTextContent("Chce se spřátelit")
    expect(links[3]).toHaveTextContent("Přítel")
    expect(get).toHaveBeenCalledWith("friends/search", { searchParams: { q: "nov" } })
    expect(screen.queryByRole("button", { name: "Načíst další" })).toBeNull()
  })

  it("says nobody was found", async () => {
    answer({ items: [], nextOffset: null })
    await renderSearch("libor@example.com")

    expect(await screen.findByText(/Nikoho takového jsme nenašli/)).toBeInTheDocument()
  })

  it("loads the next page from where the last one ended", async () => {
    answer({ items: [person({ id: "u2" })], nextOffset: 20 })
    answer({ items: [person({ id: "u3", name: "Petr Nový" })], nextOffset: null })
    await renderSearch("nov")

    await userEvent.click(await screen.findByRole("button", { name: "Načíst další" }))

    expect(await screen.findByText("Petr Nový")).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("friends/search", {
      searchParams: { q: "nov", offset: 20 },
    })
    expect(screen.queryByRole("button", { name: "Načíst další" })).toBeNull()
  })

  it("says the search failed and lets me try again", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("down")) })
    answer({ items: [person({})], nextOffset: null })
    await renderSearch("nov")

    expect(await screen.findByText("Vyhledávání se nepovedlo.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))

    expect(await screen.findByText("Jana Nováková")).toBeInTheDocument()
  })
})

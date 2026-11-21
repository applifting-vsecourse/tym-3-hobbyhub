import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { FriendRequests } from "@/features/friendship/components/FriendRequests"

const { get, post, toast, toastError } = vi.hoisted(() => {
  const toastError = vi.fn()
  return {
    get: vi.fn(),
    post: vi.fn(),
    toast: Object.assign(vi.fn(), { error: toastError }),
    toastError,
  }
})
vi.mock("sonner", () => ({ toast }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get, post },
}))

const now = new Date("2026-11-15T12:00:00.000Z")

const aRequest = (id: string, name: string, requestedAt: string) => ({
  id,
  requestedAt,
  sender: { id: `u-${id}`, name, image: null },
})

// #228: deciding reads the answer of `post` itself (lib/friend-requests).
const decisionFails = (status: number) =>
  post.mockRejectedValueOnce(
    new HTTPError(
      new Response("{}", { status }),
      new Request("http://x/api/friends/requests/u-r1/accept"),
      {} as never,
    ),
  )

type Page = { items: ReturnType<typeof aRequest>[]; total: number; nextOffset: number | null }

const answer = (...pages: Page[]) => {
  for (const page of pages) {
    get.mockReturnValueOnce({ json: () => Promise.resolve(page) })
  }
}

const renderRequests = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <FriendRequests now={now} />
    </QueryClientProvider>,
  )

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  toast.mockReset()
  toastError.mockReset()
})

describe("FriendRequests (#228)", () => {
  it("lists the requests as the server sends them, newest first, each with the person and the buttons", async () => {
    answer({
      items: [
        aRequest("r2", "LiborNovak", "2026-11-15T10:00:00.000Z"),
        aRequest("r1", "Deep Duck Thoughts", "2026-11-14T12:00:00.000Z"),
      ],
      total: 2,
      nextOffset: null,
    })
    await renderRequests()

    const list = await screen.findByRole("list", { name: "Žádosti o přátelství" })
    const [first, second] = within(list).getAllByRole("listitem") as [HTMLElement, HTMLElement]
    expect(within(list).getAllByRole("listitem")).toHaveLength(2)
    expect(within(first).getByRole("link", { name: "LiborNovak" })).toHaveAttribute(
      "href",
      "/profile/u-r2",
    )
    // ADR-0025: the nickname is the name, so no second line with it.
    expect(first).toHaveTextContent("LiborNovakpřed 2 h")
    expect(
      within(first).getByRole("button", { name: "Přijmout žádost o přátelství od LiborNovak" }),
    ).toBeInTheDocument()
    expect(
      within(second).getByRole("button", {
        name: "Zamítnout žádost o přátelství od Deep Duck Thoughts",
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Načíst další" })).toBeNull()
  })

  it("accepts a request and loads the list again, without it", async () => {
    answer(
      {
        items: [aRequest("r1", "Libor Novák", "2026-11-15T10:00:00.000Z")],
        total: 1,
        nextOffset: null,
      },
      { items: [], total: 0, nextOffset: null },
    )
    post.mockResolvedValueOnce(new Response("{}"))
    await renderRequests()

    await userEvent.click(
      await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Libor Novák" }),
    )

    expect(post).toHaveBeenCalledWith("friends/requests/u-r1/accept")
    expect(
      await screen.findByText(/Žádosti o přátelství, které vám lidé pošlou/),
    ).toBeInTheDocument()
  })

  // The request of a blocked account leaves the list when it loads again, and
  // its card with it: the failure is said in a toast, which stays.
  it("says in a toast that the account is gone, though its card leaves the list", async () => {
    answer(
      {
        items: [aRequest("r1", "Fresh Duckling", "2026-11-15T10:00:00.000Z")],
        total: 1,
        nextOffset: null,
      },
      { items: [], total: 0, nextOffset: null },
    )
    decisionFails(404)
    await renderRequests()

    await userEvent.click(
      await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Fresh Duckling" }),
    )

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Tento účet už není dostupný, žádost nejde vyřídit."),
    )
    expect(
      await screen.findByText(/Žádosti o přátelství, které vám lidé pošlou/),
    ).toBeInTheDocument()
  })

  it("says in a toast that a decision failed otherwise", async () => {
    answer(
      {
        items: [aRequest("r1", "Libor Novák", "2026-11-15T10:00:00.000Z")],
        total: 1,
        nextOffset: null,
      },
      {
        items: [aRequest("r1", "Libor Novák", "2026-11-15T10:00:00.000Z")],
        total: 1,
        nextOffset: null,
      },
    )
    post.mockRejectedValueOnce(new Error("down"))
    await renderRequests()

    await userEvent.click(
      await screen.findByRole("button", { name: "Zamítnout žádost o přátelství od Libor Novák" }),
    )

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Žádost se nepodařilo vyřídit. Zkuste to prosím znovu.",
      ),
    )
  })

  // Review #257: withdrawn or decided elsewhere meanwhile; the card goes and
  // a toast says why, instead of looking like a done decision.
  it("says the request is no longer current when nothing waited (409)", async () => {
    answer(
      {
        items: [aRequest("r1", "LiborNovak", "2026-11-15T10:00:00.000Z")],
        total: 1,
        nextOffset: null,
      },
      { items: [], total: 0, nextOffset: null },
    )
    decisionFails(409)
    await renderRequests()

    await userEvent.click(
      await screen.findByRole("button", { name: "Přijmout žádost o přátelství od LiborNovak" }),
    )

    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith("Žádost už není aktuální."))
    expect(toastError).not.toHaveBeenCalled()
  })

  it("loads the next 20 on request", async () => {
    answer(
      {
        items: [aRequest("r2", "Libor Novák", "2026-11-15T10:00:00.000Z")],
        total: 2,
        nextOffset: 20,
      },
      {
        items: [aRequest("r1", "Lost Gosling", "2026-11-14T10:00:00.000Z")],
        total: 2,
        nextOffset: null,
      },
    )
    await renderRequests()

    await userEvent.click(await screen.findByRole("button", { name: "Načíst další" }))

    expect(await screen.findByRole("link", { name: "Lost Gosling" })).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("friends/requests/received", {
      searchParams: { offset: 20 },
    })
  })

  it("says in one sentence what would be here when nothing waits", async () => {
    answer({ items: [], total: 0, nextOffset: null })
    await renderRequests()

    expect(
      await screen.findByText(/Žádosti o přátelství, které vám lidé pošlou, uvidíte tady/),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Vyhledat uživatele" })).toHaveAttribute(
      "href",
      "/friends",
    )
  })

  it("says the requests could not be loaded and offers to try again", async () => {
    get.mockReturnValueOnce({ json: () => Promise.reject(new Error("down")) })
    answer({
      items: [aRequest("r1", "Libor Novák", "2026-11-15T10:00:00.000Z")],
      total: 1,
      nextOffset: null,
    })
    await renderRequests()

    expect(await screen.findByText("Žádosti se nepodařilo načíst.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))

    expect(await screen.findByRole("link", { name: "Libor Novák" })).toBeInTheDocument()
  })
})

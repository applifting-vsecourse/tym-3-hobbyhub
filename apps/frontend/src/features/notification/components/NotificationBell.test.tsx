import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { NotificationBell } from "@/features/notification/components/NotificationBell"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get, post },
}))

// jsdom has no matchMedia; pretend to be a desktop so the bell opens a popover.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const aNotification = (id: string, readAt: string | null = null) => ({
  id,
  type: "NEW_REQUESTS",
  createdAt: "2030-01-01T11:55:00.000Z",
  readAt,
  actor: { id: "u2", name: "Honza_K" },
  event: { id: "e1", title: "Čtvrteční florbal" },
  group: null,
  decision: null,
  message: null,
  changes: [],
})

// What the API answers, by path: the count for the bell, the first page for
// the open popover. ky's `get()` has `.json()` on the returned promise itself.
const answer = (count: number, items: unknown[]) =>
  get.mockImplementation((path: string) => ({
    json: () =>
      Promise.resolve(
        path === "notifications/unread-count" ? { count } : { items, total: items.length },
      ),
  }))

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

const renderBell = () =>
  renderWithRouter(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <NotificationBell />
    </QueryClientProvider>,
  )

describe("NotificationBell", () => {
  it("counts the unread notifications on the bell", async () => {
    answer(3, [])
    await renderBell()

    expect(
      await screen.findByRole("button", { name: "Upozornění, 3 nepřečtená" }),
    ).toHaveTextContent("3")
  })

  it("has no number without unread notifications", async () => {
    answer(0, [])
    await renderBell()

    await waitFor(() => expect(get).toHaveBeenCalledWith("notifications/unread-count"))
    expect(screen.getByRole("button", { name: "Upozornění" })).toHaveTextContent("")
  })

  it("opens the latest notifications with a link to all of them", async () => {
    answer(1, [aNotification("n1"), aNotification("n2", "2030-01-01T11:58:00.000Z")])
    await renderBell()

    await userEvent.click(await screen.findByRole("button", { name: "Upozornění, 1 nepřečtené" }))

    const links = await screen.findAllByRole("link", {
      name: /Honza_K žádá o účast na akci Čtvrteční florbal/,
    })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "/events/e1/participants?tab=requests")
    expect(links[0]).toHaveAccessibleName(/^Nepřečtené:/)
    expect(links[1]).not.toHaveAccessibleName(/Nepřečtené/)
    expect(screen.getByRole("link", { name: "Zobrazit vše" })).toHaveAttribute(
      "href",
      "/notifications",
    )
  })

  it("marks a notification read when it is opened", async () => {
    answer(1, [aNotification("n1")])
    post.mockReturnValue({
      json: () => Promise.resolve(aNotification("n1", "2030-01-01T12:00:00Z")),
    })
    await renderBell()
    await userEvent.click(await screen.findByRole("button", { name: "Upozornění, 1 nepřečtené" }))

    await userEvent.click(await screen.findByRole("link", { name: /Honza_K žádá/ }))

    expect(post).toHaveBeenCalledWith("notifications/n1/read")
  })

  it("marks everything read at once", async () => {
    answer(2, [aNotification("n1"), aNotification("n2")])
    post.mockReturnValue({ json: () => Promise.resolve({ count: 2 }) })
    await renderBell()
    await userEvent.click(await screen.findByRole("button", { name: "Upozornění, 2 nepřečtená" }))

    await userEvent.click(await screen.findByRole("button", { name: "Označit vše jako přečtené" }))

    expect(post).toHaveBeenCalledWith("notifications/read-all")
  })

  it("tells the user there is nothing yet", async () => {
    answer(0, [])
    await renderBell()
    await waitFor(() => expect(get).toHaveBeenCalledWith("notifications/unread-count"))

    await userEvent.click(screen.getByRole("button", { name: "Upozornění" }))

    expect(await screen.findByText(/Zatím nemáš žádná upozornění/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Označit vše jako přečtené" }),
    ).not.toBeInTheDocument()
  })
})

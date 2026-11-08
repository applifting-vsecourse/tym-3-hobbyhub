import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { notificationKeys } from "@/features/notification/api/notificationKeys"
import { NotificationList } from "@/features/notification/components/NotificationList"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get, post },
}))

const now = new Date("2030-01-01T12:00:00.000Z")

const aNotification = (n: number) => ({
  id: `n${n}`,
  type: "EVENT_CANCELLED",
  createdAt: "2030-01-01T11:55:00.000Z",
  readAt: null,
  actor: { id: "u2", name: "Honza_K" },
  event: { id: `e${n}`, title: `Akce číslo ${String(n).padStart(2, "0")}` },
  group: null,
  decision: null,
  message: null,
  changes: [],
})

type Options = { searchParams?: Record<string, string> }

// The newest first: n12 … n1. `arrived` puts n13 on top, as a notification
// that comes while the list is open.
const server = (state: { arrived: boolean }) => {
  get.mockImplementation((path: string, options?: Options) => ({
    json: () => {
      const all = [...(state.arrived ? [13] : []), 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
      if (path === "notifications/unread-count") return Promise.resolve({ count: all.length })
      const offset = Number(options?.searchParams?.offset)
      const limit = Number(options?.searchParams?.limit)
      return Promise.resolve({
        items: all.slice(offset, offset + limit).map(aNotification),
        total: all.length,
      })
    },
  }))
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

const renderList = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <NotificationList
        filter={{ read: false }}
        empty="—"
        hasMorePages
        now={now}
      />
    </QueryClientProvider>,
  )
  return queryClient
}

const unreadPageCalls = () =>
  get.mock.calls.filter(
    (call) =>
      call[0] === "notifications" && (call[1] as Options | undefined)?.searchParams?.offset === "0",
  )

describe("NotificationList", () => {
  it("shows a notification once when a new one shifted the next page", async () => {
    const state = { arrived: false }
    server(state)
    await renderList()
    const more = await screen.findByRole("button", { name: "Načíst další (2)" })

    // A new one arrives before the bell's count is polled again: the next
    // page starts one row earlier and repeats the last row of the first.
    state.arrived = true
    await userEvent.click(more)

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Akce číslo 01/ })).toBeInTheDocument(),
    )
    expect(screen.getAllByRole("link", { name: /Akce číslo 03/ })).toHaveLength(1)
    expect(screen.getAllByRole("link")).toHaveLength(12)
  })

  it("loads the list again when the number of unread ones changes", async () => {
    const state = { arrived: false }
    server(state)
    const queryClient = await renderList()
    expect(await screen.findByRole("link", { name: /Akce číslo 12/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(queryClient.getQueryData(notificationKeys.unreadCount())).toEqual({ count: 12 }),
    )
    expect(unreadPageCalls()).toHaveLength(1)

    // The bell's poll finds one more.
    state.arrived = true
    await act(() => queryClient.refetchQueries({ queryKey: notificationKeys.unreadCount() }))

    expect(await screen.findByRole("link", { name: /Akce číslo 13/ })).toBeInTheDocument()
    expect(unreadPageCalls()).toHaveLength(2)
  })
})

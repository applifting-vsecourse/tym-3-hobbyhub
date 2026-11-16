import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Notification } from "@/features/notification/api/notificationSchemas"
import { NotificationItem } from "@/features/notification/components/NotificationItem"

const { post, toast } = vi.hoisted(() => ({
  post: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}))
vi.mock("sonner", () => ({ toast }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post },
}))

const now = new Date("2030-01-01T12:00:00.000Z")

const aFriendRequest = (
  status: "PENDING" | "ACCEPTED" | "REJECTED",
  overrides: Partial<Notification> = {},
): Notification => ({
  id: "n1",
  type: "FRIEND_REQUEST",
  createdAt: new Date("2030-01-01T11:55:00.000Z"),
  readAt: null,
  actor: { id: "u2", name: "Libor" },
  event: null,
  group: null,
  friendRequest: { id: "fr1", status },
  decision: null,
  message: null,
  changes: [],
  reminder: null,
  reason: null,
  ...overrides,
})

const renderItem = async (notification: Notification) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, "invalidateQueries")
  const onOpen = vi.fn()
  await renderWithRouter(
    <QueryClientProvider client={client}>
      <NotificationItem
        notification={notification}
        onOpen={onOpen}
        now={now}
      />
    </QueryClientProvider>,
  )
  return { invalidate, onOpen }
}

beforeEach(() => {
  post.mockReset()
  toast.mockReset()
})

describe("NotificationItem, a friend request (#228)", () => {
  it("leads by the sentence to the person, with the buttons under it", async () => {
    const { onOpen } = await renderItem(aFriendRequest("PENDING"))

    const link = await screen.findByRole("link", { name: /Libor vás žádá o přátelství/ })
    expect(link).toHaveAttribute("href", "/profile/u2")
    expect(
      screen.getByRole("button", { name: "Přijmout žádost o přátelství od Libor" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Zamítnout žádost o přátelství od Libor" }),
    ).toBeInTheDocument()

    await userEvent.click(link)
    expect(onOpen).toHaveBeenCalled()
  })

  it.each([
    ["Přijmout", "accept"],
    ["Zamítnout", "reject"],
  ])("%s decides the request and loads what it changed again", async (label, decision) => {
    post.mockResolvedValueOnce(new Response("{}"))
    const { invalidate, onOpen } = await renderItem(aFriendRequest("PENDING"))

    await userEvent.click(
      await screen.findByRole("button", { name: `${label} žádost o přátelství od Libor` }),
    )

    expect(post).toHaveBeenCalledWith(`friends/requests/u2/${decision}`)
    // The notifications, the requests and the profile; nothing else (review #257).
    await vi.waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["notifications"] }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["friendship"] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["profile"] })
    expect(invalidate).not.toHaveBeenCalledWith()
    // Deciding is not opening: the bell stays open.
    expect(onOpen).not.toHaveBeenCalled()
  })

  it("says the request is no longer current when it was decided elsewhere (409)", async () => {
    post.mockRejectedValueOnce(
      new HTTPError(
        new Response("{}", { status: 409 }),
        new Request("http://x/api/friends/requests/u2/accept"),
        {} as never,
      ),
    )
    const { invalidate } = await renderItem(aFriendRequest("PENDING"))

    await userEvent.click(
      await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Libor" }),
    )

    // In a toast: the row itself may go once the real state loads (withdrawn).
    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith("Žádost už není aktuální."))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["notifications"] })
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it.each([
    [404, "Tento účet už není dostupný, žádost nejde vyřídit."],
    [500, "Žádost se nepodařilo vyřídit. Zkuste to prosím znovu."],
  ])("says what went wrong (%i)", async (status, text) => {
    post.mockRejectedValueOnce(
      new HTTPError(
        new Response("{}", { status }),
        new Request("http://x/api/friends/requests/u2/accept"),
        {} as never,
      ),
    )
    await renderItem(aFriendRequest("PENDING"))

    await userEvent.click(
      await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Libor" }),
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(text)
  })

  it.each([
    ["ACCEPTED", "Přijato"],
    ["REJECTED", "Zamítnuto"],
  ] as const)(
    "shows what became of a decided request (%s), without buttons",
    async (status, text) => {
      await renderItem(aFriendRequest(status, { readAt: now }))

      expect(await screen.findByText(text)).toBeInTheDocument()
      expect(screen.queryByRole("button")).toBeNull()
    },
  )
})

describe("NotificationItem, an accepted request (#228)", () => {
  it("leads to the person who accepted, as one link", async () => {
    await renderItem(
      aFriendRequest("ACCEPTED", {
        type: "FRIEND_REQUEST_ACCEPTED",
        actor: { id: "u3", name: "Jana" },
      }),
    )

    expect(
      await screen.findByRole("link", { name: /Jana přijal\(a\) vaši žádost o přátelství/ }),
    ).toHaveAttribute("href", "/profile/u3")
    expect(screen.queryByRole("button")).toBeNull()
  })
})

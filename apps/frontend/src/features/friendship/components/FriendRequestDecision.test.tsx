import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { FriendRequestDecision } from "@/features/friendship/components/FriendRequestDecision"

const { post, toastError } = vi.hoisted(() => ({ post: vi.fn(), toastError: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post },
}))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

beforeEach(() => {
  post.mockReset()
  toastError.mockReset()
})

describe("FriendRequestDecision (#228)", () => {
  // In the tab „Žádosti“ the card of a blocked account leaves the list before
  // the failure is reported; the toast must come all the same.
  it("says the failure in a toast even when the buttons are gone by then", async () => {
    let fail: (error: Error) => void = () => undefined
    post.mockReturnValueOnce({
      json: () =>
        new Promise((_resolve, reject) => {
          fail = reject
        }),
    })
    const { unmount } = await renderWithRouter(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <FriendRequestDecision
          senderId="u2"
          senderName="Fresh Duckling"
          errorAs="toast"
        />
      </QueryClientProvider>,
    )

    await userEvent.click(
      await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Fresh Duckling" }),
    )
    unmount()
    fail(
      new HTTPError(
        new Response("{}", { status: 404 }),
        new Request("http://x/api/friends/requests/u2/accept"),
        {} as never,
      ),
    )

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Tento účet už není dostupný, žádost nejde vyřídit."),
    )
  })
})

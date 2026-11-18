import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { FriendRelation } from "@/features/friendship/api/friendshipSchemas"
import { MemberFriendship } from "@/features/friendship/components/MemberFriendship"

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post },
}))

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: toastError } }))

const renderRow = async (relation: FriendRelation) => {
  const reload = vi.fn(() => Promise.resolve())
  await renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <MemberFriendship
        userId="u2"
        name="Libor"
        relation={relation}
        reload={reload}
      />
    </QueryClientProvider>,
  )
  return { reload }
}

describe("MemberFriendship", () => {
  beforeEach(() => {
    post.mockReset()
    toastError.mockReset()
  })

  it("asks the member for friendship and reloads the list", async () => {
    post.mockReturnValueOnce({ json: () => Promise.resolve({ relation: "request_sent" }) })
    const { reload } = await renderRow("none")

    const button = screen.getByRole("button", { name: "Spřátelit: Libor" })
    expect(button).toHaveTextContent("Spřátelit")
    await userEvent.click(button)

    expect(post).toHaveBeenCalledWith("friends/requests", { json: { recipientId: "u2" } })
    await vi.waitFor(() => expect(reload).toHaveBeenCalled())
    expect(toastError).not.toHaveBeenCalled()
  })

  it("says so when the request fails", async () => {
    post.mockReturnValueOnce({ json: () => Promise.reject(new Error("down")) })
    await renderRow("none")

    await userEvent.click(screen.getByRole("button", { name: "Spřátelit: Libor" }))

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Žádost se nepodařilo odeslat. Zkuste to prosím znovu.",
      ),
    )
  })

  // Review of #225: a restricted account is told why, not to try again.
  it("says a restricted account cannot ask", async () => {
    post.mockReturnValueOnce({
      json: () =>
        Promise.reject(
          new HTTPError(
            new Response("{}", { status: 403 }),
            new Request("http://x/api/friends/requests"),
            {} as never,
          ),
        ),
    })
    await renderRow("none")

    await userEvent.click(screen.getByRole("button", { name: "Spřátelit: Libor" }))

    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Váš účet je omezený, o přátelství teď žádat nemůžete.",
      ),
    )
  })

  it.each([
    ["request_sent", "Žádost odeslána"],
    ["request_received", "Chce se spřátelit"],
    ["friends", "Přítel"],
  ] as const)("shows %s as a badge, with no button", async (relation, label) => {
    await renderRow(relation)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })
})

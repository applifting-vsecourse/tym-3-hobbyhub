import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { FriendRelation } from "@/features/friendship/api/friendshipSchemas"
import { FriendRelationAction } from "@/features/friendship/components/FriendRelationAction"

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post },
}))

const failWith = (status: number) =>
  post.mockReturnValueOnce({
    json: () =>
      Promise.reject(
        new HTTPError(
          new Response("{}", { status }),
          new Request("http://x/api/friends/requests"),
          {} as never,
        ),
      ),
  })

const renderAction = async (relation: FriendRelation) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const reload = vi.fn(() => Promise.resolve())
  await renderWithRouter(
    <QueryClientProvider client={client}>
      <FriendRelationAction
        userId="u2"
        relation={relation}
        reload={reload}
      />
    </QueryClientProvider>,
  )
  return { reload }
}

describe("FriendRelationAction", () => {
  beforeEach(() => post.mockReset())

  it("asks the person and reloads the profile, which then says the request was sent", async () => {
    post.mockReturnValueOnce({ json: () => Promise.resolve({ relation: "request_sent" }) })
    const { reload } = await renderAction("none")

    await userEvent.click(await screen.findByRole("button", { name: "Požádat o přátelství" }))

    expect(post).toHaveBeenCalledWith("friends/requests", { json: { recipientId: "u2" } })
    await vi.waitFor(() => expect(reload).toHaveBeenCalled())
    expect(screen.queryByRole("alert")).toBeNull()
  })

  // The other one asked me meanwhile, or we became friends: the reload shows it.
  it("only reloads, without an error, when the state changed meanwhile", async () => {
    failWith(409)
    const { reload } = await renderAction("none")

    await userEvent.click(await screen.findByRole("button", { name: "Požádat o přátelství" }))

    await vi.waitFor(() => expect(reload).toHaveBeenCalled())
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("says the request failed and keeps the button for another try", async () => {
    failWith(500)
    await renderAction("none")

    await userEvent.click(await screen.findByRole("button", { name: "Požádat o přátelství" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Žádost se nepodařilo odeslat")
    expect(screen.getByRole("button", { name: "Požádat o přátelství" })).toBeEnabled()
  })

  it("shows a sent request as a disabled button", async () => {
    await renderAction("request_sent")

    expect(await screen.findByRole("button", { name: "Žádost odeslána" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Požádat o přátelství" })).toBeNull()
  })

  it("says the person asks me, with no way to ask back", async () => {
    await renderAction("request_received")

    expect(await screen.findByText("Tento uživatel vás žádá o přátelství.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("marks a friend, with no request button", async () => {
    await renderAction("friends")

    expect(await screen.findByText("Přítel")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })
})

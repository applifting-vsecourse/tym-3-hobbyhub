import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { FriendRelation } from "@/features/friendship/api/friendshipSchemas"
import { FriendRelationAction } from "@/features/friendship/components/FriendRelationAction"

const { post, del } = vi.hoisted(() => ({ post: vi.fn(), del: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post, delete: del },
}))

const failWith = (status: number, method = post) =>
  method.mockReturnValueOnce({
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
        userName="Libor"
        relation={relation}
        reload={reload}
      />
    </QueryClientProvider>,
  )
  return { reload }
}

describe("FriendRelationAction", () => {
  beforeEach(() => {
    post.mockReset()
    del.mockReset()
  })

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

  describe("a request the person sent me (#228)", () => {
    it("says the person asks me and offers to accept or reject, not to ask back", async () => {
      await renderAction("request_received")

      expect(await screen.findByText("Tento uživatel vás žádá o přátelství.")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Přijmout žádost o přátelství od Libor" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Zamítnout žádost o přátelství od Libor" }),
      ).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Požádat o přátelství" })).toBeNull()
    })

    it.each([
      ["Přijmout", "accept"],
      ["Zamítnout", "reject"],
    ])("%s decides the request and reloads the profile", async (label, decision) => {
      post.mockReturnValueOnce({ json: () => Promise.resolve({ relation: "friends" }) })
      const { reload } = await renderAction("request_received")

      await userEvent.click(
        await screen.findByRole("button", { name: `${label} žádost o přátelství od Libor` }),
      )

      expect(post).toHaveBeenCalledWith(`friends/requests/u2/${decision}`)
      await vi.waitFor(() => expect(reload).toHaveBeenCalled())
      expect(screen.queryByRole("alert")).toBeNull()
    })

    it("only reloads when the request was decided elsewhere meanwhile (409)", async () => {
      failWith(409)
      const { reload } = await renderAction("request_received")

      await userEvent.click(
        await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Libor" }),
      )

      await vi.waitFor(() => expect(reload).toHaveBeenCalled())
      expect(screen.queryByRole("alert")).toBeNull()
    })

    it("says the account is gone when it was blocked or deleted (404)", async () => {
      failWith(404)
      await renderAction("request_received")

      await userEvent.click(
        await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Libor" }),
      )

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Tento účet už není dostupný, žádost nejde vyřídit.",
      )
    })

    it("says so when the decision failed", async () => {
      failWith(500)
      await renderAction("request_received")

      await userEvent.click(
        await screen.findByRole("button", { name: "Zamítnout žádost o přátelství od Libor" }),
      )

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Žádost se nepodařilo vyřídit. Zkuste to prosím znovu.",
      )
    })
  })

  it("marks a friend, with no request button", async () => {
    await renderAction("friends")

    expect(await screen.findByText("Přítel")).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })

  describe("withdrawing a sent request (#225)", () => {
    const openSheet = async () => {
      await userEvent.click(await screen.findByRole("button", { name: "Zrušit žádost" }))
      return screen.findByRole("dialog", { name: "Zrušit žádost o přátelství?" })
    }

    it("asks first and keeps the request when I change my mind", async () => {
      await renderAction("request_sent")

      const dialog = await openSheet()
      await userEvent.click(within(dialog).getByRole("button", { name: "Ponechat" }))

      expect(del).not.toHaveBeenCalled()
      expect(screen.getByRole("button", { name: "Žádost odeslána" })).toBeDisabled()
    })

    it("takes the request back and reloads the profile", async () => {
      del.mockReturnValueOnce({ json: () => Promise.resolve({ relation: "none" }) })
      const { reload } = await renderAction("request_sent")

      const dialog = await openSheet()
      await userEvent.click(within(dialog).getByRole("button", { name: "Zrušit žádost" }))

      expect(del).toHaveBeenCalledWith("friends/requests/u2")
      await vi.waitFor(() => expect(reload).toHaveBeenCalled())
      await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })

    // Decided meanwhile: the reload shows how it ended, without an error.
    it("only reloads when there was no request to take back any more", async () => {
      failWith(409, del)
      const { reload } = await renderAction("request_sent")

      const dialog = await openSheet()
      await userEvent.click(within(dialog).getByRole("button", { name: "Zrušit žádost" }))

      await vi.waitFor(() => expect(reload).toHaveBeenCalled())
      expect(screen.queryByRole("alert")).toBeNull()
    })

    it("says so in the sheet when it fails", async () => {
      failWith(500, del)
      await renderAction("request_sent")

      const dialog = await openSheet()
      await userEvent.click(within(dialog).getByRole("button", { name: "Zrušit žádost" }))

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Žádost se nepodařilo zrušit",
      )
    })
  })
})

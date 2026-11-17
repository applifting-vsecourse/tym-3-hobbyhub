import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { FriendRelation } from "@/features/friendship/api/friendshipSchemas"
import { FriendRelationAction } from "@/features/friendship/components/FriendRelationAction"

const { post, del, toast } = vi.hoisted(() => ({
  post: vi.fn(),
  del: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post, delete: del },
}))
vi.mock("sonner", () => ({ toast }))

// #228: deciding a request reads the answer of `post` itself (lib/friend-requests).
const decisionFails = (status: number) =>
  post.mockRejectedValueOnce(
    new HTTPError(
      new Response("{}", { status }),
      new Request("http://x/api/friends/requests/u2/accept"),
      {} as never,
    ),
  )

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
  const invalidate = vi.spyOn(client, "invalidateQueries")
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
  return { reload, invalidate }
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
    ])("%s decides the request and loads the profile again", async (label, decision) => {
      post.mockResolvedValueOnce(new Response("{}"))
      const { invalidate } = await renderAction("request_received")

      await userEvent.click(
        await screen.findByRole("button", { name: `${label} žádost o přátelství od Libor` }),
      )

      expect(post).toHaveBeenCalledWith(`friends/requests/u2/${decision}`)
      // Only what a decision changes, the profile among it (review #257).
      await vi.waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["profile"] }))
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["friendship"] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["notifications"] })
      expect(invalidate).not.toHaveBeenCalledWith()
      expect(screen.queryByRole("alert")).toBeNull()
    })

    it("says the request is no longer current when it was decided elsewhere (409)", async () => {
      decisionFails(409)
      const { invalidate } = await renderAction("request_received")

      await userEvent.click(
        await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Libor" }),
      )

      await vi.waitFor(() => expect(toast).toHaveBeenCalledWith("Žádost už není aktuální."))
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["profile"] })
      expect(screen.queryByRole("alert")).toBeNull()
    })

    it("says the account is gone when it was blocked or deleted (404)", async () => {
      decisionFails(404)
      await renderAction("request_received")

      await userEvent.click(
        await screen.findByRole("button", { name: "Přijmout žádost o přátelství od Libor" }),
      )

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Tento účet už není dostupný, žádost nejde vyřídit.",
      )
    })

    it("says so when the decision failed", async () => {
      decisionFails(500)
      await renderAction("request_received")

      await userEvent.click(
        await screen.findByRole("button", { name: "Zamítnout žádost o přátelství od Libor" }),
      )

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Žádost se nepodařilo vyřídit. Zkuste to prosím znovu.",
      )
    })
  })

  it("marks a friend, with no request button but a way to remove them (#226)", async () => {
    await renderAction("friends")

    expect(await screen.findByText("Přítel")).toBeInTheDocument()
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Odebrat z přátel",
    ])
  })

  describe("removing a friend (#226)", () => {
    const openSheet = async () => {
      await userEvent.click(await screen.findByRole("button", { name: "Odebrat z přátel" }))
      return screen.findByRole("dialog", { name: "Odebrat z přátel?" })
    }

    it("asks first, says the friend is not told, and keeps them when I change my mind", async () => {
      await renderAction("friends")

      const dialog = await openSheet()
      expect(within(dialog).getByText(/Libor se to nedozví/)).toBeInTheDocument()
      await userEvent.click(within(dialog).getByRole("button", { name: "Ponechat" }))

      expect(del).not.toHaveBeenCalled()
      expect(screen.getByText("Přítel")).toBeInTheDocument()
    })

    it("removes the friend and reloads the friends, the profile and the events", async () => {
      del.mockReturnValueOnce({ json: () => Promise.resolve({ relation: "none" }) })
      const { invalidate } = await renderAction("friends")

      const dialog = await openSheet()
      await userEvent.click(within(dialog).getByRole("button", { name: "Odebrat z přátel" }))

      expect(del).toHaveBeenCalledWith("friends/u2")
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["friendship"] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["profile"] })
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["events"] })
    })

    it("says so when it fails and keeps the sheet open", async () => {
      failWith(500, del)
      await renderAction("friends")

      const dialog = await openSheet()
      await userEvent.click(within(dialog).getByRole("button", { name: "Odebrat z přátel" }))

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Přítele se nepodařilo odebrat.",
      )
    })
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

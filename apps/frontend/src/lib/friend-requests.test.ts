import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { decideFriendRequest, friendRequestDecisionErrorKey } from "@/lib/friend-requests"

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post },
}))

const httpError = (status: number) =>
  new HTTPError(
    new Response("{}", { status }),
    new Request("http://x/api/friends/requests/u2/accept"),
    {} as never,
  )

beforeEach(() => post.mockReset())

describe("decideFriendRequest (#228)", () => {
  it.each(["accept", "reject"] as const)(
    "sends %s for the sender and says it is decided",
    async (decision) => {
      post.mockResolvedValueOnce(new Response("{}"))
      await expect(decideFriendRequest("u 2", decision)).resolves.toBe("decided")
      expect(post).toHaveBeenCalledWith(`friends/requests/u%202/${decision}`)
    },
  )

  it("says stale when nothing waited any more (409)", async () => {
    post.mockRejectedValueOnce(httpError(409))
    await expect(decideFriendRequest("u2", "accept")).resolves.toBe("stale")
  })

  it.each([404, 500])("passes any other failure on (%i)", async (status) => {
    const error = httpError(status)
    post.mockRejectedValueOnce(error)
    await expect(decideFriendRequest("u2", "accept")).rejects.toBe(error)
  })
})

describe("friendRequestDecisionErrorKey (#228)", () => {
  it("says the account is gone for a 404", () => {
    expect(friendRequestDecisionErrorKey(httpError(404))).toBe("friends.requests.unavailable")
  })

  it.each([
    ["a server error", httpError(500)],
    ["no connection", new TypeError("Failed to fetch")],
  ])("asks to try again for %s", (_case, error) => {
    expect(friendRequestDecisionErrorKey(error)).toBe("friends.requests.decideError")
  })
})

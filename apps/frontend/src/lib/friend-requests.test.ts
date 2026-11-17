import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  decideFriendRequest,
  friendRequestDecisionErrorKey,
  friendRequestDecisionRefreshes,
  StaleFriendRequestError,
} from "@/lib/friend-requests"

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
      await expect(decideFriendRequest("u 2", decision)).resolves.toBeUndefined()
      expect(post).toHaveBeenCalledWith(`friends/requests/u%202/${decision}`)
    },
  )

  // Review #257: a failure, so `isSuccess` never means a stale click.
  it("fails as stale when nothing waited any more (409)", async () => {
    post.mockRejectedValueOnce(httpError(409))
    await expect(decideFriendRequest("u2", "accept")).rejects.toBeInstanceOf(
      StaleFriendRequestError,
    )
  })

  it.each([404, 500])("passes any other failure on (%i)", async (status) => {
    const error = httpError(status)
    post.mockRejectedValueOnce(error)
    await expect(decideFriendRequest("u2", "accept")).rejects.toBe(error)
  })
})

describe("friendRequestDecisionRefreshes (review #257)", () => {
  it("refreshes the requests, the notifications, the sender's profile and the events", () => {
    expect(friendRequestDecisionRefreshes("u2")).toEqual([
      ["friendship"],
      ["notifications"],
      ["profile", "user", "u2"],
      // #226: a new friend shows in „Akce přátel“ and the event detail.
      ["events"],
    ])
  })
})

describe("friendRequestDecisionErrorKey (#228)", () => {
  it("says the request is no longer there for a stale one", () => {
    expect(friendRequestDecisionErrorKey(new StaleFriendRequestError())).toBe(
      "friends.requests.stale",
    )
  })

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

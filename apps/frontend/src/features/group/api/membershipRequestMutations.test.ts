import { HTTPError } from "@/lib/api-client"

import {
  decideMembershipRequest,
  MembershipRefusedError,
  requestMembership,
} from "@/features/group/api/membershipRequestMutations"

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { post },
}))

beforeEach(() => {
  post.mockReset()
})

// What ky throws for an error status: the body is already read into `data`,
// and the response body can no longer be read.
const httpError = (status: number, data: unknown) =>
  Object.assign(Object.create(HTTPError.prototype) as HTTPError, {
    response: { status, clone: () => Promise.reject(new TypeError("Body already used")) },
    data,
  })

const failWith = (error: Error) => post.mockReturnValue({ json: () => Promise.reject(error) })

const request = {
  id: "r1",
  groupId: "g1",
  status: "PENDING",
  message: "Ahoj",
  requestedAt: "2030-01-01T10:00:00.000Z",
}

describe("membership request mutations", () => {
  it("sends a request with the message", async () => {
    post.mockReturnValue({ json: () => Promise.resolve(request) })

    await expect(requestMembership({ groupId: "g1", message: "Ahoj" })).resolves.toMatchObject({
      status: "PENDING",
    })
    expect(post).toHaveBeenCalledWith("groups/g1/requests", { json: { message: "Ahoj" } })
  })

  it("decides on the request's own path, with the reason of a rejection", async () => {
    post.mockReturnValue({ json: () => Promise.resolve({ ...request, status: "REJECTED" }) })

    await decideMembershipRequest({ groupId: "g1", requestId: "r1", decision: "approve" })
    await decideMembershipRequest({
      groupId: "g1",
      requestId: "r1",
      decision: "reject",
      reason: "Plno",
    })

    expect(post).toHaveBeenNthCalledWith(1, "groups/g1/requests/r1/approve", { json: {} })
    expect(post).toHaveBeenNthCalledWith(2, "groups/g1/requests/r1/reject", {
      json: { reason: "Plno" },
    })
  })

  it("reads why the server refused from the body ky has already parsed", async () => {
    failWith(
      httpError(400, {
        statusCode: 400,
        message: ["Your request to join this group was rejected"],
        violations: ["REJECTED_BEFORE"],
      }),
    )

    const refused = await requestMembership({ groupId: "g1" }).catch((error: unknown) => error)

    expect(refused).toBeInstanceOf(MembershipRefusedError)
    expect((refused as MembershipRefusedError).violations).toEqual(["REJECTED_BEFORE"])
  })

  it("leaves other failures as they are", async () => {
    const invalid = httpError(400, { statusCode: 400, message: ["message is too long"] })
    failWith(invalid)
    await expect(requestMembership({ groupId: "g1" })).rejects.toBe(invalid)

    const down = httpError(500, undefined)
    failWith(down)
    await expect(
      decideMembershipRequest({ groupId: "g1", requestId: "r1", decision: "approve" }),
    ).rejects.toBe(down)
  })
})

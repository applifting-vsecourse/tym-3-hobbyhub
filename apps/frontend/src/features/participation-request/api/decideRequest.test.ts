import { beforeEach, describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"

import {
  approveRequest,
  DecisionRefusedError,
  rejectRequest,
} from "@/features/participation-request/api/decideRequest"

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

const approved = {
  id: "r1",
  eventId: "e1",
  status: "APPROVED",
  message: null,
  requestedAt: "2030-01-01T10:00:00.000Z",
}

describe("decideRequest", () => {
  it("approves the request on its own path", async () => {
    post.mockReturnValue({ json: () => Promise.resolve(approved) })

    await expect(approveRequest({ eventId: "e1", requestId: "r1" })).resolves.toMatchObject({
      status: "APPROVED",
    })
    expect(post).toHaveBeenCalledWith("events/e1/requests/r1/approve", { json: {} })
  })

  it("sends the reason with a rejection", async () => {
    post.mockReturnValue({ json: () => Promise.resolve({ ...approved, status: "REJECTED" }) })

    await rejectRequest({ eventId: "e1", requestId: "r1", reason: "Plno" })

    expect(post).toHaveBeenCalledWith("events/e1/requests/r1/reject", { json: { reason: "Plno" } })
  })

  it("reads why the server refused from the body ky has already parsed", async () => {
    failWith(
      httpError(400, {
        statusCode: 400,
        message: ["The applicant already has a seat at this event"],
        violations: ["APPLICANT_HAS_SEAT"],
      }),
    )

    const error = await approveRequest({ eventId: "e1", requestId: "r1" }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(DecisionRefusedError)
    expect((error as DecisionRefusedError).violations).toEqual(["APPLICANT_HAS_SEAT"])
  })

  it("passes other failures on as they are", async () => {
    const broken = httpError(400, { message: ["reason must be shorter"] })
    failWith(broken)

    await expect(rejectRequest({ eventId: "e1", requestId: "r1" })).rejects.toBe(broken)
  })
})

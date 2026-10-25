import { afterEach, describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"

import { JoinRefusedError, requestToJoin } from "@/features/participation-request/api/requestToJoin"

// The server's answer, through the real ky: it reads an error body before the
// caller sees the error, which a mocked `requestToJoin` would never show.
const respond = (status: number, body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ),
  )

const failure = (request: Promise<unknown>) =>
  request.then(
    () => {
      throw new Error("The request did not fail")
    },
    (error: unknown) => error,
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("requestToJoin", () => {
  it("returns the request the server created", async () => {
    respond(201, {
      id: "r1",
      eventId: "e1",
      status: "PENDING",
      message: "Ahoj",
      requestedAt: "2030-01-01T10:00:00.000Z",
    })

    await expect(requestToJoin({ eventId: "e1", message: "Ahoj" })).resolves.toMatchObject({
      id: "r1",
      status: "PENDING",
    })
  })

  it("says why the server refused the request", async () => {
    respond(400, {
      statusCode: 400,
      error: "Bad Request",
      message: ["The event is full"],
      violations: ["EVENT_FULL"],
    })

    const error = await failure(requestToJoin({ eventId: "e1" }))

    expect(error).toBeInstanceOf(JoinRefusedError)
    expect((error as JoinRefusedError).violations).toEqual(["EVENT_FULL"])
  })

  it("passes a refused message on with the server's words", async () => {
    respond(400, {
      statusCode: 400,
      error: "Bad Request",
      message: ["message must be shorter than or equal to 500 characters"],
    })

    const error = await failure(requestToJoin({ eventId: "e1", message: "x" }))

    expect(error).toBeInstanceOf(HTTPError)
    expect((error as HTTPError).message).toBe(
      "message must be shorter than or equal to 500 characters",
    )
  })
})

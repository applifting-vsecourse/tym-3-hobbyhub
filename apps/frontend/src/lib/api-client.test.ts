import { afterEach, describe, expect, it, vi } from "vitest"

import { api, HTTPError } from "@/lib/api-client"

// The server's answer, through the real ky: it reads an error body before
// the hooks run, which a mocked `api` would never show.
const respond = (status: number, body: string, contentType = "application/json") =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(new Response(body, { status, headers: { "Content-Type": contentType } })),
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

describe("api", () => {
  it("puts the server's message on a failed request", async () => {
    respond(
      400,
      JSON.stringify({
        statusCode: 400,
        message: "Event not found",
        error: "Bad Request",
      }),
    )

    const error = await failure(api.get("events/e1").json())

    expect(error).toBeInstanceOf(HTTPError)
    expect((error as HTTPError).message).toBe("Event not found")
  })

  it("joins the messages of a refused validation", async () => {
    respond(
      400,
      JSON.stringify({
        statusCode: 400,
        message: ["content should not be empty", "content must be a string"],
        error: "Bad Request",
      }),
    )

    const error = await failure(api.post("quacks", { json: {} }).json())

    expect((error as HTTPError).message).toBe(
      "content should not be empty, content must be a string",
    )
  })

  it("keeps ky's message when the body has none", async () => {
    respond(502, "<html>Bad Gateway</html>", "text/html")

    const error = await failure(api.get("events").json())

    expect(error).toBeInstanceOf(HTTPError)
    expect((error as HTTPError).message).toContain("502")
  })
})

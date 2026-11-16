import { afterEach, describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"

import { fileReport, ReportRefusedError } from "@/features/report/api/fileReport"

// The server's answer, through the real ky: it reads an error body before the
// caller sees the error, which a mocked `fileReport` would never show.
// Returns what was sent, read before ky reads the body itself.
const respond = (status: number, body: unknown) => {
  const sent: { method: string; url: string; body: unknown }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      sent.push({ method: request.method, url: request.url, body: await request.clone().json() })
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    }),
  )
  return sent
}

const failure = (request: Promise<unknown>) =>
  request.then(
    () => {
      throw new Error("The request did not fail")
    },
    (error: unknown) => error,
  )

const input = {
  target: { type: "USER" as const, id: "u2" },
  reasonId: "reason1",
  text: "Po akci mi opakovaně posílá zprávy.",
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// #240, ADR-0023.
describe("fileReport", () => {
  it("sends the target, the reason and the text, and returns that it arrived", async () => {
    const sent = respond(201, { id: "r1", createdAt: "2030-01-01T10:00:00.000Z" })

    await expect(fileReport(input)).resolves.toEqual({
      id: "r1",
      createdAt: new Date("2030-01-01T10:00:00.000Z"),
    })
    expect(sent).toHaveLength(1)
    expect(sent[0]?.method).toBe("POST")
    expect(sent[0]?.url).toMatch(/\/reports$/)
    expect(sent[0]?.body).toEqual({
      targetType: "USER",
      targetId: "u2",
      reasonId: "reason1",
      text: "Po akci mi opakovaně posílá zprávy.",
    })
  })

  it("says the reporter has an open report about the target already", async () => {
    respond(409, {
      statusCode: 409,
      error: "Conflict",
      message: ["You have an open report about this already"],
      violations: ["ALREADY_REPORTED"],
    })

    const error = await failure(fileReport(input))

    expect(error).toBeInstanceOf(ReportRefusedError)
    expect((error as ReportRefusedError).violations).toEqual(["ALREADY_REPORTED"])
  })

  it("says why the server refused the report", async () => {
    respond(400, {
      statusCode: 400,
      error: "Bad Request",
      message: ["An organizer cannot report their own event"],
      violations: ["OWN_EVENT"],
    })

    const error = await failure(fileReport({ ...input, target: { type: "EVENT", id: "e1" } }))

    expect((error as ReportRefusedError).violations).toEqual(["OWN_EVENT"])
  })

  it("passes on a target that does not exist for the reporter", async () => {
    respond(404, { statusCode: 404, message: "User not found" })

    const error = await failure(fileReport(input))

    expect(error).toBeInstanceOf(HTTPError)
    expect((error as HTTPError).response.status).toBe(404)
  })
})

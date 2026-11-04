import { describe, expect, it } from "vitest"

import { HTTPError } from "@/lib/api-client"
import { EmailNotVerifiedError, rethrowEmailNotVerified } from "@/lib/emailNotVerified"

const httpError = (status: number, data: unknown) =>
  Object.assign(Object.create(HTTPError.prototype) as HTTPError, {
    response: { status },
    data,
  })

describe("rethrowEmailNotVerified", () => {
  it("names the refusal for an unverified e-mail", () => {
    expect(() =>
      rethrowEmailNotVerified(httpError(400, { violations: ["EMAIL_NOT_VERIFIED"] })),
    ).toThrow(EmailNotVerifiedError)
  })

  it("leaves another refusal as it was", () => {
    const other = httpError(400, { message: ["title is too short"] })
    expect(() => rethrowEmailNotVerified(other)).toThrow(other)
  })

  it("leaves other errors as they were", () => {
    const failure = new Error("offline")
    expect(() => rethrowEmailNotVerified(failure)).toThrow(failure)
  })
})

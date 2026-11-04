import { z } from "zod"

import { HTTPError } from "@/lib/api-client"

/** The server refuses until the person's e-mail is verified (F-03.2). */
export class EmailNotVerifiedError extends Error {
  constructor() {
    super("EMAIL_NOT_VERIFIED")
    this.name = "EmailNotVerifiedError"
  }
}

const refusalSchema = z.object({ violations: z.array(z.string()) })

/**
 * For the `catch` of a call that publishes something (an event, a group):
 * turns the server's "verify your e-mail first" into an `EmailNotVerifiedError`
 * the page can explain, and rethrows anything else untouched.
 */
export function rethrowEmailNotVerified(error: unknown): never {
  if (error instanceof HTTPError && error.response.status === 400) {
    // ky has already read the body into `error.data`; the response itself can
    // no longer be read.
    const refusal = refusalSchema.safeParse(error.data)
    if (refusal.success && refusal.data.violations.includes("EMAIL_NOT_VERIFIED")) {
      throw new EmailNotVerifiedError()
    }
  }
  throw error
}

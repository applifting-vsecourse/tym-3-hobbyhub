import { api, HTTPError } from "@/lib/api-client"

import { eventSchema, type CreateEventInput, type Event } from "@/features/event/api/eventSchemas"

/** The server refuses to publish until the organizer's e-mail is verified (F-03.2). */
export class EmailNotVerifiedError extends Error {
  constructor() {
    super("EMAIL_NOT_VERIFIED")
    this.name = "EmailNotVerifiedError"
  }
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  try {
    const json = await api.post("events", { json: input }).json()
    return eventSchema.parse(json)
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 400) {
      const body: unknown = await error.response
        .clone()
        .json()
        .catch(() => null)
      const violations = (body as { violations?: unknown } | null)?.violations
      if (Array.isArray(violations) && violations.includes("EMAIL_NOT_VERIFIED")) {
        throw new EmailNotVerifiedError()
      }
    }
    throw error
  }
}

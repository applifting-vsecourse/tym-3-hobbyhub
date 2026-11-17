import { api, HTTPError } from "@/lib/api-client"

import {
  ratingRefusalSchema,
  ratingSchema,
  type Rating,
  type RatingInput,
  type RatingViolation,
} from "@/features/rating/api/ratingSchemas"

/** The server refused the rating for a reason the page can explain. */
export class RatingRefusedError extends Error {
  constructor(readonly violations: RatingViolation[]) {
    super(violations.join(", "))
    this.name = "RatingRefusedError"
  }
}

async function submit(path: string, { stars, comment }: RatingInput): Promise<Rating> {
  try {
    return ratingSchema.parse(await api.post(path, { json: { stars, comment } }).json())
  } catch (error) {
    // ky has already read the body into `error.data`.
    if (error instanceof HTTPError && error.response.status === 400) {
      const refusal = ratingRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new RatingRefusedError(refusal.data.violations)
    }
    throw error
  }
}

/** A participant rates the main organizer (#234). Final once sent. */
export function rateOrganizer(eventId: string, input: RatingInput) {
  return submit(`events/${eventId}/ratings/organizer`, input)
}

/** The main organizer rates one participant (#235). Final once sent. */
export function rateParticipant(eventId: string, participantId: string, input: RatingInput) {
  return submit(`events/${eventId}/ratings/participants/${participantId}`, input)
}

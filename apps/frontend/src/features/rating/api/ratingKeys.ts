import type { RatingDirection } from "@/features/rating/api/ratingSchemas"

// Every key carries who is signed in, so the next person on this device never
// sees the ratings of the one before.
export const ratingKeys = {
  all: () => ["ratings"] as const,
  /** Who the person may rate at one event (#236). */
  eventState: (eventId: string, userId: string) =>
    [...ratingKeys.all(), "event", eventId, userId] as const,
  received: (userId: string, direction: RatingDirection) =>
    [...ratingKeys.all(), "received", userId, direction] as const,
  given: (userId: string) => [...ratingKeys.all(), "given", userId] as const,
}

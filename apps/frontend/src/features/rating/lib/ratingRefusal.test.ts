import type { TFunction } from "i18next"
import { describe, expect, it } from "vitest"

import { RatingRefusedError } from "@/features/rating/api/submitRating"
import { ratingErrorMessage, ratingRefusalOf } from "@/features/rating/lib/ratingRefusal"

// The key itself, so the test says which text is shown without repeating it.
const t = ((key: string) => key) as unknown as TFunction

describe("ratingRefusalOf", () => {
  it("names the event's own reason before the person's", () => {
    expect(ratingRefusalOf(["ALREADY_RATED", "RATING_CLOSED"])).toBe("RATING_CLOSED")
    expect(ratingRefusalOf(["NO_SEAT", "EVENT_CANCELLED"])).toBe("EVENT_CANCELLED")
  })

  it("has nothing to name without a reason", () => {
    expect(ratingRefusalOf([])).toBeNull()
  })
})

describe("ratingErrorMessage", () => {
  it("explains a refusal with the server's reason", () => {
    expect(ratingErrorMessage(t, new RatingRefusedError(["ALREADY_RATED"]))).toBe(
      "rating.refused.ALREADY_RATED",
    )
  })

  it("says sending failed for anything else", () => {
    expect(ratingErrorMessage(t, new Error("offline"))).toBe("rating.form.failed")
    expect(ratingErrorMessage(t, new RatingRefusedError([]))).toBe("rating.form.failed")
  })
})

import { describe, expect, it } from "vitest"

import type { RatingTarget } from "@/features/rating/api/ratingSchemas"
import {
  clearPrefill,
  draftKey,
  emptyDrafts,
  prefill,
  progressOf,
  readyRatings,
  reviewOf,
  type ReadyRating,
} from "@/features/rating/lib/participantDrafts"

const aTarget = (id: string, overrides: Partial<RatingTarget> = {}): RatingTarget => ({
  user: { id, name: id },
  rating: null,
  violations: [],
  ...overrides,
})

const rated: Partial<RatingTarget> = {
  rating: {
    id: "r",
    eventId: "e",
    direction: "TO_PARTICIPANT",
    ratedUserId: "x",
    stars: 4,
    comment: null,
    createdAt: new Date(),
  },
  violations: ["ALREADY_RATED"],
}

const ready = (id: string, stars: number, comment = ""): ReadyRating => ({
  target: aTarget(id),
  stars,
  comment,
})

const names = (ratings: ReadyRating[]) => ratings.map(({ target }) => target.user.id)

describe("participant drafts (#235)", () => {
  it("keys a draft so that no id is read as an array index", () => {
    expect(draftKey("123")).toBe("u_123")
    expect(emptyDrafts([aTarget("a")])).toEqual({ u_a: { stars: null, comment: "" } })
  })

  it("sends drafts with stars, of participants still open, in the order of the list", () => {
    const targets = [aTarget("a"), aTarget("b", rated), aTarget("c"), aTarget("d")]
    const drafts = {
      u_a: { stars: 5, comment: "  Super  " },
      u_b: { stars: 3, comment: "" },
      u_c: { stars: null, comment: "" },
      u_d: { stars: 2, comment: "" },
    }

    expect(readyRatings(targets, drafts)).toEqual([
      { target: targets[0], stars: 5, comment: "Super" },
      { target: targets[3], stars: 2, comment: "" },
    ])
  })

  it("counts the sent ratings out of everyone on the list", () => {
    expect(progressOf([aTarget("a", rated), aTarget("b"), aTarget("c")])).toEqual({
      rated: 1,
      total: 3,
    })
  })

  it("prefills five stars only where nothing is chosen, and takes back only that", () => {
    const targets = [aTarget("a"), aTarget("b"), aTarget("c", rated), aTarget("d")]
    const drafts = {
      u_a: { stars: 2, comment: "" },
      u_b: { stars: null, comment: "Fajn" },
      u_c: { stars: null, comment: "" },
      u_d: { stars: null, comment: "" },
    }

    const filled = prefill(targets, drafts)

    expect(filled.prefilledIds).toEqual(["b", "d"])
    expect(filled.drafts).toEqual({
      u_a: { stars: 2, comment: "" },
      u_b: { stars: 5, comment: "Fajn" },
      u_c: { stars: null, comment: "" },
      u_d: { stars: 5, comment: "" },
    })
    expect(clearPrefill(filled.drafts, filled.prefilledIds)).toEqual(drafts)
  })

  describe("review", () => {
    it("groups the most common stars given without a comment, the rest lowest first", () => {
      const { group, singles } = reviewOf([
        ready("a", 5),
        ready("b", 4),
        ready("c", 5),
        ready("d", 5, "Výborný"),
        ready("e", 2),
        ready("f", 5),
      ])

      expect(group?.stars).toBe(5)
      expect(names(group?.ratings ?? [])).toEqual(["a", "c", "f"])
      expect(names(singles)).toEqual(["e", "b", "d"])
    })

    it("takes the higher stars when two groups are as large", () => {
      const { group, singles } = reviewOf([
        ready("a", 3),
        ready("b", 4),
        ready("c", 3),
        ready("d", 4),
      ])

      expect(group?.stars).toBe(4)
      expect(names(singles)).toEqual(["a", "c"])
    })

    it("lists one by one when no two share the stars", () => {
      const { group, singles } = reviewOf([ready("a", 5), ready("b", 1), ready("c", 3, "x")])

      expect(group).toBeNull()
      expect(names(singles)).toEqual(["b", "c", "a"])
    })
  })
})

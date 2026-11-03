import { describe, expect, it } from "vitest"

import { ACTIVITY_KEYS } from "@/components/hobbyhub/ActivityIcon"
import { COVER_IDS, COVERS, coverSrc, defaultCoverId } from "@/components/hobbyhub/profileCovers"

describe("profile covers", () => {
  it("has at least 20 of them, and one for every sport the app knows", () => {
    expect(COVER_IDS.length).toBeGreaterThanOrEqual(20)
    for (const activity of ACTIVITY_KEYS) expect(COVER_IDS).toContain(activity)
  })

  it("defaults to the cover of the first sport, or to the people", () => {
    expect(defaultCoverId("florbal")).toBe("florbal")
    expect(defaultCoverId("something-new")).toBe("roster")
    expect(defaultCoverId(undefined)).toBe("roster")
  })

  it("shows the chosen cover over the default, and ignores one it does not know", () => {
    expect(coverSrc("sachy", "florbal")).toBe(COVERS.sachy)
    expect(coverSrc(null, "florbal")).toBe(COVERS.florbal)
    expect(coverSrc("gone", "florbal")).toBe(COVERS.florbal)
  })

  it("shows the person's own picture as it is", () => {
    expect(coverSrc("data:image/webp;base64,AAAA", "florbal")).toBe("data:image/webp;base64,AAAA")
  })
})

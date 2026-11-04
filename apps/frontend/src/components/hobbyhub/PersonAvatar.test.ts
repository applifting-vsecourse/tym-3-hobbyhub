import { describe, expect, it } from "vitest"

import { illustrationOf, initialsOf } from "@/components/hobbyhub/PersonAvatar"

describe("initialsOf", () => {
  it.each([
    ["Honza Krupka", "HK"],
    ["honza", "H"],
    ["Deep Duck Thoughts", "DD"],
    ["Admin (Delete in Prod)", "AD"],
    ["  Šárka   Černá ", "ŠČ"],
    ["Honza_K", "H"],
  ])("takes the first letters of %s", (name, initials) => {
    expect(initialsOf(name)).toBe(initials)
  })
})

describe("illustrationOf", () => {
  it("names one of our illustrated people", () => {
    expect(illustrationOf("avatar:florbalista")).toBe("florbalista")
  })

  it.each([["avatar:unknown"], ["https://example.com/a.webp"], [null], [undefined]])(
    "does not for %s",
    (picture) => {
      expect(illustrationOf(picture)).toBeNull()
    },
  )
})

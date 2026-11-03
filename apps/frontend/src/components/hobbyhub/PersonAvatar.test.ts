import { describe, expect, it } from "vitest"

import { initialsOf } from "@/components/hobbyhub/PersonAvatar"

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

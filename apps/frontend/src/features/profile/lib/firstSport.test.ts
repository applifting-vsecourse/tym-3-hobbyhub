import { describe, expect, it } from "vitest"

import { firstSportIcon } from "@/features/profile/lib/firstSport"

describe("firstSportIcon", () => {
  it("takes the first by name, whatever order they were added in", () => {
    const florbal = { name: "Florbal", icon: "florbal" }
    const badminton = { name: "Badminton", icon: "badminton" }

    expect(firstSportIcon([florbal, badminton])).toBe("badminton")
    expect(firstSportIcon([badminton, florbal])).toBe("badminton")
  })

  it("sorts Czech names the Czech way", () => {
    expect(
      firstSportIcon([
        { name: "Šachy", icon: "sachy" },
        { name: "Tenis", icon: "tenis" },
      ]),
    ).toBe("sachy")
  })

  it("has none for no sports", () => {
    expect(firstSportIcon([])).toBeUndefined()
  })
})

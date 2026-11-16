import { describe, expect, it } from "vitest"

import { nicknameProblem, normalizeNickname } from "@/lib/nickname"

describe("nicknameProblem", () => {
  it.each(["CaffeinatedDuck", "jan.novak", "kacka_92", "abc", "a".repeat(30)])(
    "accepts %s",
    (value) => {
      expect(nicknameProblem(value)).toBeNull()
    },
  )

  it.each([
    ["nothing", "", "required"],
    ["too short", "ab", "tooShort"],
    ["too long", "a".repeat(31), "tooLong"],
    ["a space", "Jan Novak", "invalid"],
    ["diacritics", "Kačka", "invalid"],
    ["a dash", "jan-novak", "invalid"],
    ["a reserved word", "HobbyHubTeam", "reserved"],
    ["a reserved word in other letter case", "xADMINx", "reserved"],
    ["mod on its own", "Mod", "reserved"],
    ["a reserved word next to badminton", "BadmintonAdmin", "reserved"],
  ])("refuses %s", (_, value, problem) => {
    expect(nicknameProblem(value)).toBe(problem)
  })

  it("lets mod through inside another word", () => {
    expect(nicknameProblem("Modrak")).toBeNull()
  })

  it.each(["BadmintonPetr", "EcosystemFan"])(
    "accepts %s, where the reserved word is part of an ordinary one",
    (value) => {
      expect(nicknameProblem(value)).toBeNull()
    },
  )
})

describe("normalizeNickname", () => {
  it("ignores letter case", () => {
    expect(normalizeNickname("CaffeinatedDuck")).toBe("caffeinatedduck")
  })
})

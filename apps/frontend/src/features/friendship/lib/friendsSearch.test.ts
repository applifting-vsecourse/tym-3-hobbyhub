import { friendsSearchSchema } from "@/features/friendship/lib/friendsSearch"

describe("friendsSearchSchema", () => {
  it.each(["friends", "requests"] as const)("keeps the %s tab", (tab) => {
    expect(friendsSearchSchema.parse({ tab })).toEqual({ tab })
  })

  it.each([{}, { tab: "search" }, { tab: "nonsense" }, { tab: 3 }])(
    "falls back to the search for %j",
    (search) => {
      expect(friendsSearchSchema.parse(search).tab).toBeUndefined()
    },
  )
})

describe("friendsSearchSchema q", () => {
  it("keeps the searched text (#225)", () => {
    expect(friendsSearchSchema.parse({ q: "nov" })).toEqual({ q: "nov" })
  })

  it("drops a text that is no string", () => {
    expect(friendsSearchSchema.parse({ q: 3 }).q).toBeUndefined()
  })
})

// Review of #225: the address is read like the field, so the server never
// gets a text it refuses (400) where the field would have shown a hint.
describe("friendsSearchSchema q from the address", () => {
  it("trims the spaces around the text", () => {
    expect(friendsSearchSchema.parse({ q: " a " }).q).toBe("a")
  })

  it("cuts a text longer than the server takes", () => {
    expect(friendsSearchSchema.parse({ q: "x".repeat(150) }).q).toHaveLength(100)
  })
})

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

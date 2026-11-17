import { friendsSearchSchema } from "@/features/friendship/lib/friendsSearch"

describe("friendsSearchSchema", () => {
  it.each(["events", "requests", "search"] as const)("keeps the %s tab", (tab) => {
    expect(friendsSearchSchema.parse({ tab })).toEqual({ tab })
  })

  // #226: the friends are the default tab now.
  it.each([{}, { tab: "friends" }, { tab: "nonsense" }, { tab: 3 }])(
    "falls back to the friends for %j",
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

describe("friendsSearchSchema sort (#226)", () => {
  it.each(["oldest", "name_asc", "name_desc"] as const)("keeps the %s order", (sort) => {
    expect(friendsSearchSchema.parse({ sort })).toEqual({ sort })
  })

  it.each(["newest", "nonsense", 3])("drops %j, the newest friendship first", (sort) => {
    expect(friendsSearchSchema.parse({ sort }).sort).toBeUndefined()
  })
})

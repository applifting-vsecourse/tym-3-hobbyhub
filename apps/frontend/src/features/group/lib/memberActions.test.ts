import type { GroupMember } from "@/features/group/api/membershipRequestSchemas"
import { memberActions } from "@/features/group/lib/memberActions"

const aMember = (role: GroupMember["role"], userId = "other"): GroupMember => ({
  userId,
  name: "Deep Duck Thoughts",
  image: null,
  role,
  joinedAt: new Date(2026, 0, 1),
})

describe("memberActions", () => {
  it.each([
    ["OWNER", "MEMBER", ["makeAdmin", "transfer", "remove"]],
    ["OWNER", "ADMIN", ["demote", "transfer", "remove"]],
    ["ADMIN", "MEMBER", ["remove"]],
    ["ADMIN", "ADMIN", []],
    ["ADMIN", "OWNER", []],
    ["MEMBER", "MEMBER", []],
  ] as const)("%s acting on %s may %j", (myRole, theirRole, expected) => {
    expect(memberActions({ userId: "me", role: myRole }, aMember(theirRole))).toEqual(expected)
  })

  it("offers nothing on one's own row", () => {
    expect(memberActions({ userId: "me", role: "OWNER" }, aMember("OWNER", "me"))).toEqual([])
  })
})

import { AVATAR_KINDS } from "@/components/hobbyhub/ActivityAvatar"

import { memberAvatar } from "@/features/group/lib/memberAvatar"

describe("memberAvatar", () => {
  it("gives the same person the same figure every time", () => {
    expect(memberAvatar("user-1")).toBe(memberAvatar("user-1"))
  })

  it("picks one of the illustrated figures", () => {
    for (const id of ["a", "user-1", "cm9x2", ""]) {
      expect(AVATAR_KINDS).toContain(memberAvatar(id))
    }
  })
})

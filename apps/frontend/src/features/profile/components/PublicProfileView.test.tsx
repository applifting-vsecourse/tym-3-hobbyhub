import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { PublicProfile } from "@/features/profile/api/profileSchemas"
import { PublicProfileView } from "@/features/profile/components/PublicProfileView"

const profile: PublicProfile = {
  id: "u2",
  name: "Petr",
  bio: "Běhám po práci",
  image: null,
  cover: null,
  interests: [{ activity: { id: "a1", name: "Běh", icon: "beh" }, level: null }],
}

const renderProfile = (overrides: Partial<PublicProfile> = {}) =>
  renderWithRouter(
    <PublicProfileView
      profile={{ ...profile, ...overrides }}
      activityLabel={(activity) => activity.name}
    />,
  )

describe("PublicProfileView", () => {
  it("shows the nickname, the bio and what the person plays", async () => {
    await renderProfile()
    expect(screen.getByRole("heading", { level: 1, name: "Petr" })).toBeDefined()
    expect(screen.getByText("Běhám po práci")).toBeDefined()
    expect(screen.getByText("Běh")).toBeDefined()
  })

  it("shows no contact: the e-mail is nobody's but the owner's", async () => {
    await renderProfile()
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull()
  })

  it("leaves out empty parts instead of showing blanks", async () => {
    await renderProfile({ bio: null, interests: [] })
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
  })
})

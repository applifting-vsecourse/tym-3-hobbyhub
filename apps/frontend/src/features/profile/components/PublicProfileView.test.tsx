import type { ReactNode } from "react"
import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { PublicProfile } from "@/features/profile/api/profileSchemas"
import { PublicProfileView } from "@/features/profile/components/PublicProfileView"

const profile: PublicProfile = {
  id: "u2",
  name: "Petr",
  nickname: null,
  relation: "none",
  bio: "Běhám po práci",
  image: null,
  cover: null,
  interests: [{ activity: { id: "a1", name: "Běh", icon: "beh" }, level: null }],
}

const renderProfile = (overrides: Partial<PublicProfile> = {}, friendAction?: ReactNode) =>
  renderWithRouter(
    <PublicProfileView
      profile={{ ...profile, ...overrides }}
      activityLabel={(activity) => activity.name}
      friendAction={friendAction}
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

  // #225: the username is public, like the name.
  it("shows the nickname under the name, when the person has one", async () => {
    await renderProfile({ nickname: "BehajiciPetr" })
    expect(screen.getByText("@BehajiciPetr")).toBeInTheDocument()
  })

  it("shows no nickname line without one", async () => {
    await renderProfile()
    expect(screen.queryByText(/^@/)).toBeNull()
  })

  it("puts the friendship action under the bio", async () => {
    await renderProfile({}, <button type="button">Požádat o přátelství</button>)
    const bio = screen.getByText("Běhám po práci")
    const action = screen.getByRole("button", { name: "Požádat o přátelství" })
    expect(bio.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

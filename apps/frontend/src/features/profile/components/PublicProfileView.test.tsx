import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { PublicProfile } from "@/features/profile/api/profileSchemas"
import { PublicProfileView } from "@/features/profile/components/PublicProfileView"

const profile: PublicProfile = {
  id: "u2",
  name: "Petr",
  joinedAt: new Date(2026, 8, 2),
  bio: "Běhám po práci",
  image: null,
  cover: null,
  interests: [{ activity: { id: "a1", name: "Běh", icon: "beh" }, level: null }],
  email: null,
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

  it("shows no contact and nothing private without an e-mail from the server", async () => {
    await renderProfile()
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull()
    expect(screen.queryByText(/Jen pro vás/)).toBeNull()
  })

  it("shows the e-mail when the server sends it", async () => {
    await renderProfile({ email: "petr@example.com" })
    expect(screen.getByRole("link", { name: "petr@example.com" }).getAttribute("href")).toBe(
      "mailto:petr@example.com",
    )
  })

  it("leaves out empty parts instead of showing blanks", async () => {
    await renderProfile({ bio: null, interests: [] })
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
  })
})

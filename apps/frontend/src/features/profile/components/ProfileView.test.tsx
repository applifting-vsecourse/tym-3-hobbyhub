import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { ProfileView } from "@/features/profile/components/ProfileView"

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  name: "Jana",
  joinedAt: new Date("2026-09-15T10:00:00Z"),
  bio: "Hraju rok, rád zkusím nové věci.",
  image: null,
  cover: null,
  gender: "FEMALE",
  birthDate: "1990-05-17",
  interests: [
    {
      activity: { id: "a1", name: "Florbal", icon: "florbal" },
      level: { id: "l1", name: "Pokročilý" },
    },
    { activity: { id: "a2", name: "Šachy", icon: "sachy" }, level: null },
  ],
  address: {
    street: "Sokolovská 12",
    city: "Praha 8",
    postalCode: "186 00",
    country: "Česko",
    latitude: 50.09,
    longitude: 14.44,
  },
  ...overrides,
})

const renderView = (value: Profile) =>
  renderWithRouter(
    <ProfileView
      profile={value}
      activityLabel={(activity) => activity.name}
    />,
  )

describe("ProfileView", () => {
  it("shows the profile as others see it, with a way to edit it", async () => {
    await renderView(profile())

    expect(screen.getByRole("heading", { level: 1, name: "Jana" })).toBeInTheDocument()
    expect(screen.getByText("Hraju rok, rád zkusím nové věci.")).toBeInTheDocument()
    expect(screen.getByText("Florbal")).toBeInTheDocument()
    expect(screen.getByText("Šachy")).toBeInTheDocument()
    expect(screen.getByText("Pokročilý")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Upravit profil" })).toHaveAttribute(
      "href",
      "/profile/edit",
    )
  })

  it("keeps the home city under the private heading, and never shows gender or birth date", async () => {
    await renderView(profile())

    expect(screen.getByRole("heading", { name: "Jen pro vás" })).toBeInTheDocument()
    expect(screen.getByText("Praha 8")).toBeInTheDocument()
    expect(screen.queryByText("1990-05-17")).not.toBeInTheDocument()
    expect(screen.queryByText("Žena")).not.toBeInTheDocument()
  })

  it("invites to fill in an empty profile", async () => {
    await renderView(profile({ bio: null, interests: [], address: null }))

    expect(screen.getByRole("link", { name: "Napsat pár slov" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Přidat, co hraju" })).toBeInTheDocument()
    expect(screen.getByText("Adresu jste zatím nezadali")).toBeInTheDocument()
  })
})

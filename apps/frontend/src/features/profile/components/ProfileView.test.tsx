import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { ProfileView } from "@/features/profile/components/ProfileView"

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  name: "Jana",
  nicknameChangeableFrom: null,
  joinedAt: new Date("2026-09-15T10:00:00Z"),
  bio: "Hraju rok, rád zkusím nové věci.",
  image: null,
  cover: null,
  gender: "FEMALE",
  birthYear: 1990,
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
  friendsSeeEventHistory: true,
  friendsSeeUpcomingEvents: false,
  ratings: { asOrganizer: { count: 0, average: null }, asParticipant: { count: 0, average: null } },
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

  it("keeps the home city and the birth year under the private heading, never the gender", async () => {
    await renderView(profile())

    expect(screen.getByRole("heading", { name: "Jen pro vás" })).toBeInTheDocument()
    expect(screen.getByText("Praha 8")).toBeInTheDocument()
    expect(screen.getByText("Rok narození 1990")).toBeInTheDocument()
    expect(screen.queryByText("Žena")).not.toBeInTheDocument()
  })

  it("says under the private heading what friends see, with a way to change it (#227)", async () => {
    await renderView(profile())

    expect(screen.getByText("Přátelé vidí vaši historii akcí")).toBeInTheDocument()
    expect(screen.getByText("Přátelé nevidí vaše budoucí akce")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "úpravě profilu" })).toHaveAttribute(
      "href",
      "/profile/edit",
    )
  })

  it("follows the switches the other way round too (#227)", async () => {
    await renderView(profile({ friendsSeeEventHistory: false, friendsSeeUpcomingEvents: true }))

    expect(screen.getByText("Přátelé nevidí vaši historii akcí")).toBeInTheDocument()
    expect(screen.getByText("Přátelé vidí vaše budoucí akce")).toBeInTheDocument()
  })

  it("invites to fill in an empty profile", async () => {
    await renderView(profile({ bio: null, interests: [], address: null, birthYear: null }))

    expect(screen.getByRole("link", { name: "Napsat pár slov" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Přidat, co hraju" })).toBeInTheDocument()
    expect(screen.getByText("Adresu jste zatím nezadali")).toBeInTheDocument()
    expect(screen.getByText("Rok narození jste zatím nezadali")).toBeInTheDocument()
  })

  // #236: the owner sees their numbers even below three ratings, and why
  // others do not.
  it("shows both scores, with a word on what others see below three", async () => {
    await renderView(
      profile({
        ratings: {
          asOrganizer: { count: 4, average: 4.5 },
          asParticipant: { count: 2, average: 5 },
        },
      }),
    )

    expect(screen.getByRole("heading", { name: "Hodnocení" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Hodnocení 4,5 z 5, 4 hodnocení" })).toBeInTheDocument()
    expect(screen.getByText("Máš 2 hodnocení, ostatním se ukáže od 3.")).toBeInTheDocument()
  })

  // #234: who rated them and what they sent is theirs alone, one tap away.
  it("leads to the person's own ratings", async () => {
    await renderView(profile())

    expect(screen.getByRole("link", { name: "Zobrazit moje hodnocení" })).toHaveAttribute(
      "href",
      "/profile/ratings",
    )
  })
})

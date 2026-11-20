import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"
import { renderWithRouter } from "@/test/renderWithRouter"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { EditProfileForm } from "@/features/profile/components/EditProfileForm"

const requests = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  updateInterests: vi.fn(),
  updateLocation: vi.fn(),
  removeLocation: vi.fn(),
  updatePrivateDetails: vi.fn(),
}))
vi.mock("@/features/profile/api/profileRequests", () => requests)

// #212: whether the nickname is free; the server is not asked in these tests.
const availability = vi.hoisted(() => ({ value: "idle" }))
vi.mock("@/hooks/useNicknameAvailability", () => ({
  useNicknameAvailability: () => availability.value,
}))

const profile: Profile = {
  name: "Jana",
  nicknameChangeableFrom: null,
  joinedAt: new Date("2026-09-01T10:00:00Z"),
  bio: null,
  image: null,
  cover: null,
  gender: "FEMALE",
  birthYear: 1990,
  interests: [{ activity: { id: "a1", name: "Florbal", icon: "florbal" }, level: null }],
  address: null,
  friendsSeeEventHistory: true,
  friendsSeeUpcomingEvents: false,
  ratings: { asOrganizer: { count: 0, average: null }, asParticipant: { count: 0, average: null } },
}

const renderForm = (shown: Profile = profile) =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <EditProfileForm
        profile={shown}
        activities={[
          { id: "a1", name: "Florbal", icon: "florbal" },
          { id: "a2", name: "Šachy", icon: "sachy" },
        ]}
        activityLabel={(activity) => activity.name}
        levels={[{ id: "l1", name: "Pokročilý" }]}
      />
    </QueryClientProvider>,
  )

describe("EditProfileForm", () => {
  beforeEach(() => {
    for (const request of Object.values(requests)) request.mockReset().mockResolvedValue(profile)
    availability.value = "idle"
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it("saves nothing by itself: only the Uložit button sends the changes", async () => {
    await renderForm()

    await userEvent.type(screen.getByLabelText("Krátké bio (nepovinné)"), "Hraju rok")
    await userEvent.tab()
    expect(requests.updateProfile).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(requests.updateProfile).toHaveBeenCalled())
    expect(requests.updateProfile.mock.calls[0]?.[0]).toEqual({ bio: "Hraju rok" })
  })

  it("sends only the parts that changed", async () => {
    await renderForm()

    await userEvent.type(screen.getByLabelText("Přezdívka"), "_2")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(requests.updateProfile).toHaveBeenCalled())
    // Not the picture or the cover along with the new nickname.
    expect(requests.updateProfile.mock.calls[0]?.[0]).toEqual({ name: "Jana_2" })
    expect(requests.updateInterests).not.toHaveBeenCalled()
    expect(requests.updateLocation).not.toHaveBeenCalled()
    expect(requests.updatePrivateDetails).not.toHaveBeenCalled()
  })

  describe("what friends see (#227)", () => {
    const history = () => screen.getByRole("switch", { name: "Přátelé vidí moji historii akcí" })
    const upcoming = () => screen.getByRole("switch", { name: "Přátelé vidí moje budoucí akce" })

    it("shows the history on and the upcoming events off by default", async () => {
      await renderForm()

      expect(history()).toBeChecked()
      expect(upcoming()).not.toBeChecked()
    })

    it("shows what was saved", async () => {
      await renderForm({
        ...profile,
        friendsSeeEventHistory: false,
        friendsSeeUpcomingEvents: true,
      })

      expect(history()).not.toBeChecked()
      expect(upcoming()).toBeChecked()
    })

    it("saves both switches only with Uložit, and nothing else", async () => {
      await renderForm()

      await userEvent.click(upcoming())
      expect(upcoming()).toBeChecked()
      expect(requests.updatePrivateDetails).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

      await waitFor(() => expect(requests.updatePrivateDetails).toHaveBeenCalled())
      expect(requests.updatePrivateDetails.mock.calls[0]?.[0]).toEqual({
        friendsSeeEventHistory: true,
        friendsSeeUpcomingEvents: true,
      })
      expect(requests.updateProfile).not.toHaveBeenCalled()
    })

    it("saves the switches together with a corrected gender in one request", async () => {
      await renderForm()

      await userEvent.click(history())
      await userEvent.click(screen.getByRole("combobox", { name: "Pohlaví" }))
      await userEvent.click(await screen.findByRole("option", { name: "Muž" }))
      await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

      await waitFor(() => expect(requests.updatePrivateDetails).toHaveBeenCalled())
      expect(requests.updatePrivateDetails).toHaveBeenCalledTimes(1)
      expect(requests.updatePrivateDetails.mock.calls[0]?.[0]).toEqual({
        gender: "MALE",
        birthYear: 1990,
        friendsSeeEventHistory: false,
        friendsSeeUpcomingEvents: false,
      })
    })

    it("toggles a switch from its label", async () => {
      await renderForm()

      await userEvent.click(screen.getByText("Přátelé vidí moji historii akcí"))
      expect(history()).not.toBeChecked()
    })
  })

  it("refuses an empty nickname and says why", async () => {
    await renderForm()

    await userEvent.clear(screen.getByLabelText("Přezdívka"))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText("Zadejte přezdívku")).toBeInTheDocument()
    expect(requests.updateProfile).not.toHaveBeenCalled()
  })

  it("tells the user when the save fails", async () => {
    requests.updateProfile.mockRejectedValue(new Error("boom"))
    await renderForm()

    await userEvent.type(screen.getByLabelText("Přezdívka"), "_2")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText(/nepodařilo uložit/)).toBeInTheDocument()
  })

  // #212, ADR-0025.
  describe("the unique nickname", () => {
    const refusal = (code: string) =>
      Object.assign(
        new HTTPError(
          new Response("{}", { status: 400 }),
          new Request("http://x/api/profile"),
          {} as never,
        ),
        { data: { message: [code], error: "Bad Request", statusCode: 400 } },
      )

    it("refuses a nickname that breaks the rules before asking the server", async () => {
      await renderForm()

      await userEvent.type(screen.getByLabelText("Přezdívka"), " Nova")
      await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

      expect(
        await screen.findByText("Použijte jen písmena bez diakritiky, číslice, _ a tečku"),
      ).toBeInTheDocument()
      expect(requests.updateProfile).not.toHaveBeenCalled()
    })

    it("keeps an older nickname that predates the rules, as long as it is not changed", async () => {
      await renderForm({ ...profile, name: "PondAdmin" })

      await userEvent.type(screen.getByLabelText("Krátké bio (nepovinné)"), "Hraju rok")
      await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

      await waitFor(() => expect(requests.updateProfile).toHaveBeenCalled())
      expect(requests.updateProfile.mock.calls[0]?.[0]).toEqual({ bio: "Hraju rok" })
    })

    it("does not save a nickname someone else has", async () => {
      availability.value = "taken"
      await renderForm()

      await userEvent.type(screen.getByLabelText("Přezdívka"), "_2")
      await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

      expect(screen.getByText("Tuhle přezdívku už někdo má. Zkuste jinou.")).toBeInTheDocument()
      expect(requests.updateProfile).not.toHaveBeenCalled()
    })

    it("says at the field when the server finds the nickname taken after all", async () => {
      requests.updateProfile.mockRejectedValue(refusal("NICKNAME_TAKEN"))
      await renderForm()

      await userEvent.type(screen.getByLabelText("Přezdívka"), "_2")
      await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

      expect(
        await screen.findByText("Tuhle přezdívku už někdo má. Zkuste jinou."),
      ).toBeInTheDocument()
      expect(screen.queryByText(/nepodařilo uložit/)).not.toBeInTheDocument()
    })

    it("keeps the nickname as it is for 30 days after a change and says until when", async () => {
      await renderForm({ ...profile, nicknameChangeableFrom: new Date("2026-12-10T12:00:00Z") })

      const field = screen.getByLabelText("Přezdívka")
      expect(field).toHaveAttribute("readonly")
      expect(field).toHaveAccessibleDescription(/znovu ji můžete změnit od 10\. prosince 2026/i)
    })
  })

  it("refuses to save with no activity left", async () => {
    await renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Odebrat Florbal" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText("Vyberte alespoň jednu aktivitu.")).toBeInTheDocument()
    expect(requests.updateInterests).not.toHaveBeenCalled()
  })

  it("sends the gender and birth year to the private endpoint", async () => {
    await renderForm()

    await userEvent.click(screen.getByRole("combobox", { name: "Pohlaví" }))
    await userEvent.click(await screen.findByRole("option", { name: "Muž" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(requests.updatePrivateDetails).toHaveBeenCalled())
    expect(requests.updatePrivateDetails.mock.calls[0]?.[0]).toEqual({
      gender: "MALE",
      birthYear: 1990,
    })
    expect(requests.updateProfile).not.toHaveBeenCalled()
  })

  it("shows the saved birth year and sends a corrected one as a number", async () => {
    await renderForm()

    const birthYear = screen.getByLabelText("Rok narození")
    expect(birthYear).toHaveValue("1990")
    await userEvent.clear(birthYear)
    await userEvent.type(birthYear, "1985")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(requests.updatePrivateDetails).toHaveBeenCalled())
    expect(requests.updatePrivateDetails.mock.calls[0]?.[0]).toEqual({
      gender: "FEMALE",
      birthYear: 1985,
    })
  })

  it.each([
    [String(new Date().getFullYear() - 17), "Registrace je možná až od 18 let"],
    ["1899", "Zadejte rok narození jako čtyřmístné číslo od 1900 do letoška"],
    ["", "Zadejte rok narození"],
  ])("refuses the birth year %p and says why", async (year, message) => {
    await renderForm()

    const birthYear = screen.getByLabelText("Rok narození")
    await userEvent.clear(birthYear)
    if (year) await userEvent.type(birthYear, year)
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(requests.updatePrivateDetails).not.toHaveBeenCalled()
  })

  it("does not send a part again that went through when a later one failed", async () => {
    requests.updateInterests.mockRejectedValueOnce(new Error("down"))
    await renderForm()

    await userEvent.type(screen.getByLabelText("Přezdívka"), "_2")
    await userEvent.click(screen.getByRole("button", { name: "Odebrat Florbal" }))
    await userEvent.click(screen.getByLabelText("Přidat aktivitu"))
    await userEvent.click(await screen.findByRole("option", { name: "Šachy" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))
    expect(await screen.findByText(/nepodařilo uložit/)).toBeInTheDocument()
    expect(requests.updateProfile).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(requests.updateInterests).toHaveBeenCalledTimes(2))
    expect(requests.updateProfile).toHaveBeenCalledTimes(1)
  })

  // The client checks the same rules, so this needs the two to disagree (here:
  // the server refuses a year the form let through).
  it("says which private detail the server refused, and that the switches wait for it", async () => {
    requests.updatePrivateDetails.mockRejectedValueOnce(
      Object.assign(
        new HTTPError(
          new Response("{}", { status: 400 }),
          new Request("http://x/api/profile/private"),
          {} as never,
        ),
        { data: { message: ["UNDERAGE"] } },
      ),
    )
    await renderForm()

    await userEvent.click(screen.getByRole("switch", { name: "Přátelé vidí moje budoucí akce" }))
    const birthYear = screen.getByLabelText("Rok narození")
    await userEvent.clear(birthYear)
    await userEvent.type(birthYear, "1985")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText("Registrace je možná až od 18 let")).toBeInTheDocument()
    expect(screen.getByText(/Soukromé údaje jsme neuložili/)).toBeInTheDocument()
    expect(screen.queryByText(/Změny se nepodařilo uložit/)).toBeNull()
    expect(requests.updatePrivateDetails).toHaveBeenCalledTimes(1)
    // What the user set stays on screen, to be saved once the year is fixed.
    expect(screen.getByRole("switch", { name: "Přátelé vidí moje budoucí akce" })).toBeChecked()
  })

  describe("location privacy", () => {
    const withAddress: Profile = {
      ...profile,
      address: {
        street: "Sokolovská 12",
        city: "Praha 8",
        postalCode: "186 00",
        country: "Česko",
        latitude: 50.0942,
        longitude: 14.4421,
      },
    }

    it("says who sees the location and that no history is kept", async () => {
      await renderForm()

      expect(screen.getByText(/Lokalitu z uživatelů vidíte jen vy/)).toBeInTheDocument()
      expect(screen.getByText(/neukládá historii polohy/)).toBeInTheDocument()
    })

    it("offers no removal while there is no location", async () => {
      await renderForm()

      expect(screen.queryByRole("button", { name: "Odstranit lokalitu" })).not.toBeInTheDocument()
    })

    it("removes the whole location only after the confirmation", async () => {
      requests.removeLocation.mockResolvedValue({ ...withAddress, address: null })
      await renderForm(withAddress)

      await userEvent.click(screen.getByRole("button", { name: "Odstranit lokalitu" }))
      expect(requests.removeLocation).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole("button", { name: "Odstranit" }))

      await waitFor(() => expect(requests.removeLocation).toHaveBeenCalledTimes(1))
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "Odstranit lokalitu" }),
        ).not.toBeInTheDocument(),
      )
    })

    it("keeps the location when the removal is declined or fails", async () => {
      requests.removeLocation.mockRejectedValue(new Error("offline"))
      await renderForm(withAddress)

      await userEvent.click(screen.getByRole("button", { name: "Odstranit lokalitu" }))
      await userEvent.click(screen.getByRole("button", { name: "Ponechat" }))
      expect(requests.removeLocation).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole("button", { name: "Odstranit lokalitu" }))
      await userEvent.click(screen.getByRole("button", { name: "Odstranit" }))

      expect(await screen.findByText(/nepodařilo odstranit/)).toBeInTheDocument()
      // The open dialog hides the page behind it from the accessibility tree.
      expect(
        screen.getByRole("button", { name: "Odstranit lokalitu", hidden: true }),
      ).toBeInTheDocument()
    })
  })
})

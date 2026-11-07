import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { EditProfileForm } from "@/features/profile/components/EditProfileForm"

const requests = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  updateInterests: vi.fn(),
  updateLocation: vi.fn(),
  updatePrivateDetails: vi.fn(),
}))
vi.mock("@/features/profile/api/profileRequests", () => requests)

const profile: Profile = {
  name: "Jana",
  joinedAt: new Date("2026-09-01T10:00:00Z"),
  bio: null,
  image: null,
  cover: null,
  gender: "FEMALE",
  birthYear: 1990,
  interests: [{ activity: { id: "a1", name: "Florbal", icon: "florbal" }, level: null }],
  address: null,
}

const renderForm = () =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <EditProfileForm
        profile={profile}
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

    await userEvent.type(screen.getByLabelText("Přezdívka"), "!")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(requests.updateProfile).toHaveBeenCalled())
    // Not the picture or the cover along with the new nickname.
    expect(requests.updateProfile.mock.calls[0]?.[0]).toEqual({ name: "Jana!" })
    expect(requests.updateInterests).not.toHaveBeenCalled()
    expect(requests.updateLocation).not.toHaveBeenCalled()
    expect(requests.updatePrivateDetails).not.toHaveBeenCalled()
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

    await userEvent.type(screen.getByLabelText("Přezdívka"), "!")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText(/nepodařilo uložit/)).toBeInTheDocument()
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

    await userEvent.type(screen.getByLabelText("Přezdívka"), "!")
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
})

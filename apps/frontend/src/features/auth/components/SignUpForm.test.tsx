import { createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SignUpForm } from "@/features/auth/components/SignUpForm"

// #212: whether the nickname is free; the server is not asked in these tests.
const availability = vi.hoisted(() => ({ value: "idle" }))
vi.mock("@/hooks/useNicknameAvailability", () => ({
  useNicknameAvailability: () => availability.value,
}))

// The terms link is a router <Link>, so the form needs a router around it.
const renderForm = (onSubmit = vi.fn()) => {
  const rootRoute = createRootRoute({
    component: () => (
      <SignUpForm
        isLoading={false}
        onSubmit={onSubmit}
      />
    ),
  })
  render(<RouterProvider router={createRouter({ routeTree: rootRoute })} />)
  return onSubmit
}

const typeBirthYear = async (year: number | string) => {
  await userEvent.type(await screen.findByLabelText("Rok narození"), String(year))
}

const ADULTHOOD = /potvrzuji, že je mi alespoň 18 let/i
const THIS_YEAR = new Date().getFullYear()

const SUBMIT = "Vytvořit účet a pokračovat"

const fillTheRest = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("E-mail"), "jana@example.com")
  await user.type(screen.getByLabelText("Heslo"), "correct-horse")
  await user.type(screen.getByLabelText("Zopakujte heslo"), "correct-horse")
  await user.click(screen.getByRole("combobox", { name: "Pohlaví" }))
  await user.click(await screen.findByRole("option", { name: "Žena" }))
  await typeBirthYear(1995)
  await user.click(screen.getByRole("checkbox", { name: ADULTHOOD }))
  await user.click(screen.getByRole("checkbox", { name: /souhlasím s podmínkami/i }))
}

describe("SignUpForm", () => {
  beforeEach(() => {
    availability.value = "idle"
  })

  // #212, ADR-0025.
  describe("the unique nickname", () => {
    it("explains the rules at the field", async () => {
      renderForm()

      expect(await screen.findByLabelText("Přezdívka")).toHaveAccessibleDescription(
        /3–30 znaků.*musí být jen vaše/i,
      )
    })

    it.each([
      ["a space", "Jana Nova", "Použijte jen písmena bez diakritiky, číslice, _ a tečku"],
      ["diacritics", "Kačka", "Použijte jen písmena bez diakritiky, číslice, _ a tečku"],
      ["too few characters", "Ja", "Přezdívka musí mít alespoň 3 znaky"],
      [
        "a reserved word",
        "HobbyHubJana",
        "Přezdívka nesmí obsahovat slova jako admin, moderator nebo hobbyhub",
      ],
    ])("refuses a nickname with %s", async (_, nickname, message) => {
      const onSubmit = renderForm()
      const user = userEvent.setup()

      await user.type(await screen.findByLabelText("Přezdívka"), nickname)
      await fillTheRest(user)
      await user.click(screen.getByRole("button", { name: SUBMIT }))

      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("says while typing that the nickname is free", async () => {
      availability.value = "available"
      renderForm()

      expect(await screen.findByText("Přezdívka je volná.")).toBeInTheDocument()
    })

    it("does not submit a nickname someone else has", async () => {
      availability.value = "taken"
      const onSubmit = renderForm()
      const user = userEvent.setup()

      await user.type(await screen.findByLabelText("Přezdívka"), "BreadCritic")
      await fillTheRest(user)
      await user.click(screen.getByRole("button", { name: SUBMIT }))

      expect(screen.getByText("Tuhle přezdívku už někdo má. Zkuste jinou.")).toBeInTheDocument()
      expect(screen.getByLabelText("Přezdívka")).toHaveFocus()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it("links the consent to the terms, in a new tab", async () => {
    renderForm()

    const link = await screen.findByRole("link", { name: "podmínkami a zásadami ochrany údajů" })
    expect(link).toHaveAttribute("href", "/terms")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("explains the birth year and gender right at their fields", async () => {
    renderForm()

    expect(await screen.findByLabelText("Rok narození")).toHaveAccessibleDescription(
      /stačí rok.*ověření věku 18\+/i,
    )
    expect(screen.getByLabelText("Pohlaví")).toHaveAccessibleDescription(/soukromý údaj/i)
  })

  it("asks for gender, birth year, the confirmation of adulthood and consent", async () => {
    const onSubmit = renderForm()

    await userEvent.click(await screen.findByRole("button", { name: SUBMIT }))

    expect(await screen.findByText("Vyberte pohlaví")).toBeInTheDocument()
    expect(screen.getByText("Zadejte rok narození")).toBeInTheDocument()
    expect(
      screen.getByText("Registrace je možná jen od 18 let, potvrďte svou plnoletost"),
    ).toBeInTheDocument()
    expect(screen.getByText("Bez souhlasu s podmínkami se nelze zaregistrovat")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits a complete registration", async () => {
    const onSubmit = renderForm()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText("Přezdívka"), "Jana")
    await user.type(screen.getByLabelText("E-mail"), "jana@example.com")
    await user.type(screen.getByLabelText("Heslo"), "correct-horse")
    await user.type(screen.getByLabelText("Zopakujte heslo"), "correct-horse")
    await user.click(screen.getByRole("combobox", { name: "Pohlaví" }))
    await user.click(await screen.findByRole("option", { name: "Žena" }))
    await typeBirthYear(1995)
    await user.click(screen.getByRole("checkbox", { name: ADULTHOOD }))
    await user.click(screen.getByRole("checkbox", { name: /souhlasím s podmínkami/i }))
    await user.click(screen.getByRole("button", { name: SUBMIT }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      username: "Jana",
      email: "jana@example.com",
      password: "correct-horse",
      confirmPassword: "correct-horse",
      gender: "FEMALE",
      birthYear: 1995,
      adulthoodConfirmed: true,
      termsAccepted: true,
    })
  })

  it("does not submit when the repeated password differs", async () => {
    const onSubmit = renderForm()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText("Heslo"), "correct-horse")
    await user.type(screen.getByLabelText("Zopakujte heslo"), "correct-horsf")
    await user.click(screen.getByRole("button", { name: SUBMIT }))

    expect(await screen.findByText("Hesla se neshodují")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("keeps the password exactly as typed, spaces included", async () => {
    const onSubmit = renderForm()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText("Přezdívka"), "Jana")
    await user.type(screen.getByLabelText("E-mail"), "jana@example.com")
    await user.type(screen.getByLabelText("Heslo"), " correct-horse ")
    await user.type(screen.getByLabelText("Zopakujte heslo"), " correct-horse ")
    await user.click(screen.getByRole("combobox", { name: "Pohlaví" }))
    await user.click(await screen.findByRole("option", { name: "Žena" }))
    await typeBirthYear(1995)
    await user.click(screen.getByRole("checkbox", { name: ADULTHOOD }))
    await user.click(screen.getByRole("checkbox", { name: /souhlasím s podmínkami/i }))
    await user.click(screen.getByRole("button", { name: SUBMIT }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ password: " correct-horse " })
  })

  it("shows the empty-repeat message and toggles the repeated field", async () => {
    renderForm()
    const user = userEvent.setup()

    const repeat = await screen.findByLabelText("Zopakujte heslo")
    await user.click(screen.getByRole("button", { name: SUBMIT }))
    expect(await screen.findByText("Zopakujte heslo", { selector: "p" })).toBeInTheDocument()
    await user.click(screen.getAllByRole("button", { name: "Zobrazit heslo" })[1]!)
    expect(repeat).toHaveAttribute("type", "text")
  })

  it("does not accept a password shorter than 8 characters", async () => {
    const onSubmit = renderForm()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText("Heslo"), "short")
    await user.type(screen.getByLabelText("Zopakujte heslo"), "short")
    await user.click(screen.getByRole("button", { name: SUBMIT }))

    expect(await screen.findByText("Heslo musí mít alespoň 8 znaků")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("flags a short password after leaving the field and re-checks the repeat when the password changes", async () => {
    renderForm()
    const user = userEvent.setup()

    const password = await screen.findByLabelText("Heslo")
    await user.type(password, "short")
    await user.tab()
    expect(await screen.findByText("Heslo musí mít alespoň 8 znaků")).toBeInTheDocument()

    await user.type(screen.getByLabelText("Zopakujte heslo"), "shortt")
    await user.tab()
    expect(await screen.findByText("Hesla se neshodují")).toBeInTheDocument()

    await user.type(password, "t")
    await vi.waitFor(() => expect(screen.queryByText("Hesla se neshodují")).not.toBeInTheDocument())
  })

  it("refuses a year in which nobody can be 18 yet", async () => {
    const onSubmit = renderForm()

    await typeBirthYear(THIS_YEAR - 17)
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }))

    expect(await screen.findByText("Registrace je možná až od 18 let")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("lets through the year in which someone turns 18", async () => {
    renderForm()

    await typeBirthYear(THIS_YEAR - 18)
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }))

    expect(await screen.findByText("Vyberte pohlaví")).toBeInTheDocument()
    expect(screen.queryByText("Registrace je možná až od 18 let")).not.toBeInTheDocument()
    expect(screen.queryByText(/zadejte rok narození/i)).not.toBeInTheDocument()
  })

  it.each(["1899", "95", String(THIS_YEAR + 1)])("refuses the year %s", async (year) => {
    const onSubmit = renderForm()

    await typeBirthYear(year)
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }))

    expect(
      await screen.findByText("Zadejte rok narození jako čtyřmístné číslo od 1900 do letoška"),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("does not submit without the confirmation of adulthood", async () => {
    const onSubmit = renderForm()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText("Přezdívka"), "Jana")
    await user.type(screen.getByLabelText("E-mail"), "jana@example.com")
    await user.type(screen.getByLabelText("Heslo"), "correct-horse")
    await user.type(screen.getByLabelText("Zopakujte heslo"), "correct-horse")
    await user.click(screen.getByRole("combobox", { name: "Pohlaví" }))
    await user.click(await screen.findByRole("option", { name: "Žena" }))
    await typeBirthYear(1995)
    await user.click(screen.getByRole("checkbox", { name: /souhlasím s podmínkami/i }))
    await user.click(screen.getByRole("button", { name: SUBMIT }))

    expect(
      await screen.findByText("Registrace je možná jen od 18 let, potvrďte svou plnoletost"),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows and hides the password", async () => {
    renderForm()
    const user = userEvent.setup()
    const password = await screen.findByLabelText("Heslo")

    expect(password).toHaveAttribute("type", "password")
    await user.click(screen.getAllByRole("button", { name: "Zobrazit heslo" })[0]!)
    expect(password).toHaveAttribute("type", "text")
    await user.click(screen.getByRole("button", { name: "Skrýt heslo" }))
    expect(password).toHaveAttribute("type", "password")
  })

  describe("signing up with Google", () => {
    const renderGoogleForm = (getRegistrationSpy = vi.fn()) => {
      const rootRoute = createRootRoute({
        component: () => (
          <SignUpForm
            isLoading={false}
            isGoogleOnly
            onSubmit={vi.fn()}
            renderGoogle={(getRegistration) => (
              <button
                type="button"
                onClick={async () => {
                  getRegistrationSpy(await getRegistration())
                }}
              >
                Pokračovat přes Google
              </button>
            )}
          />
        ),
      })
      render(<RouterProvider router={createRouter({ routeTree: rootRoute })} />)
      return getRegistrationSpy
    }

    it("asks only for the personal fields and consents, not for e-mail or password", async () => {
      renderGoogleForm()

      expect(await screen.findByLabelText("Rok narození")).toBeInTheDocument()
      expect(screen.getByLabelText(/přezdívka/i)).toBeInTheDocument()
      expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument()
      expect(screen.queryByLabelText("Heslo")).not.toBeInTheDocument()
      expect(screen.queryByLabelText("Zopakujte heslo")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: SUBMIT })).not.toBeInTheDocument()
    })

    it("hands over the registration once the fields are valid, without e-mail or password", async () => {
      const user = userEvent.setup()
      const spy = renderGoogleForm()

      await user.type(await screen.findByLabelText(/přezdívka/i), "jana.n")
      await user.click(screen.getByRole("combobox", { name: "Pohlaví" }))
      await user.click(await screen.findByRole("option", { name: "Žena" }))
      await typeBirthYear(1995)
      await user.click(screen.getByRole("checkbox", { name: ADULTHOOD }))
      await user.click(screen.getByRole("checkbox", { name: /souhlasím s podmínkami/i }))
      await user.click(screen.getByRole("button", { name: "Pokračovat přes Google" }))

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "jana.n",
          gender: "FEMALE",
          birthYear: 1995,
          adulthoodConfirmed: true,
          termsAccepted: true,
        }),
      )
    })

    it("does not go to Google while the fields are incomplete", async () => {
      const user = userEvent.setup()
      const spy = renderGoogleForm()

      await user.click(await screen.findByRole("button", { name: "Pokračovat přes Google" }))

      expect(spy).toHaveBeenCalledWith(null)
    })
  })
})

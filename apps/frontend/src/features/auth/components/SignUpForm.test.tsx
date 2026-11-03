import { createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SignUpForm } from "@/features/auth/components/SignUpForm"

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

const pickBirthDate = async (year: number, month: number, day: number) => {
  const user = userEvent.setup()
  await user.click(await screen.findByRole("button", { name: /datum narození/i }))
  const dialog = await screen.findByRole("dialog")
  // The month dropdown is rendered anew once the year changes, so look it up after.
  const yearSelect = within(dialog).getAllByRole("combobox")[1]
  await user.selectOptions(yearSelect!, String(year))
  const monthSelect = within(dialog).getAllByRole("combobox")[0]
  await user.selectOptions(monthSelect!, String(month - 1))
  await user.click(within(dialog).getByRole("button", { name: new RegExp(`^.*\\b${day}\\.`) }))
}

const SUBMIT = "Vytvořit účet a pokračovat"

describe("SignUpForm", () => {
  it("links the consent to the terms, in a new tab", async () => {
    renderForm()

    const link = await screen.findByRole("link", { name: "podmínkami a zásadami ochrany údajů" })
    expect(link).toHaveAttribute("href", "/terms")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("explains the birth date and gender right at their fields", async () => {
    renderForm()

    expect(await screen.findByLabelText("Datum narození")).toHaveAccessibleDescription(
      /ověření věku 18\+/,
    )
    expect(screen.getByLabelText("Pohlaví")).toHaveAccessibleDescription(/soukromý údaj/i)
  })

  it("asks for gender, birth date and consent", async () => {
    const onSubmit = renderForm()

    await userEvent.click(await screen.findByRole("button", { name: SUBMIT }))

    expect(await screen.findByText("Vyberte pohlaví")).toBeInTheDocument()
    expect(screen.getByText("Vyberte datum narození")).toBeInTheDocument()
    expect(screen.getByText("Bez souhlasu s podmínkami se nelze zaregistrovat")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits a complete registration", async () => {
    const onSubmit = renderForm()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText("Jméno / přezdívka"), "Jana")
    await user.type(screen.getByLabelText("E-mail"), "jana@example.com")
    await user.type(screen.getByLabelText("Heslo"), "correct-horse")
    await user.type(screen.getByLabelText("Zopakujte heslo"), "correct-horse")
    await user.click(screen.getByRole("combobox", { name: "Pohlaví" }))
    await user.click(await screen.findByRole("option", { name: "Žena" }))
    await pickBirthDate(1995, 4, 12)
    await user.click(screen.getByRole("checkbox", { name: /souhlasím s podmínkami/i }))
    await user.click(screen.getByRole("button", { name: SUBMIT }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: "Jana",
      email: "jana@example.com",
      password: "correct-horse",
      confirmPassword: "correct-horse",
      gender: "FEMALE",
      birthDate: "1995-04-12",
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

    await user.type(await screen.findByLabelText("Jméno / přezdívka"), "Jana")
    await user.type(screen.getByLabelText("E-mail"), "jana@example.com")
    await user.type(screen.getByLabelText("Heslo"), " correct-horse ")
    await user.type(screen.getByLabelText("Zopakujte heslo"), " correct-horse ")
    await user.click(screen.getByRole("combobox", { name: "Pohlaví" }))
    await user.click(await screen.findByRole("option", { name: "Žena" }))
    await pickBirthDate(1995, 4, 12)
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

  it("does not let someone under 18 register", async () => {
    const onSubmit = renderForm()

    await pickBirthDate(new Date().getFullYear() - 10, 1, 1)
    await userEvent.click(screen.getByRole("button", { name: SUBMIT }))

    expect(await screen.findByText("Registrace je možná až od 18 let")).toBeInTheDocument()
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
})

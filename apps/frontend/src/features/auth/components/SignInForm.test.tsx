import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

import { SignInForm } from "@/features/auth/components/SignInForm"

describe("SignInForm", () => {
  afterEach(async () => {
    await i18n.changeLanguage("cs")
  })

  it("re-translates validation errors already on screen when the language changes", async () => {
    render(
      <SignInForm
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Přihlásit se" }))
    expect(await screen.findByText("Zadejte e-mail")).toBeInTheDocument()

    await act(() => i18n.changeLanguage("en"))

    expect(await screen.findByText("Email is required")).toBeInTheDocument()
    expect(screen.queryByText("Zadejte e-mail")).not.toBeInTheDocument()
  })

  it("tells an empty e-mail apart from a malformed one", async () => {
    const user = userEvent.setup()
    render(
      <SignInForm
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText("E-mail"), "  jana@  ")
    await user.click(screen.getByRole("button", { name: "Přihlásit se" }))

    expect(await screen.findByText("Neplatný e-mail")).toBeInTheDocument()
    expect(screen.queryByText("Zadejte e-mail")).not.toBeInTheDocument()
  })

  it("keeps the user signed in by default and lets them opt out", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <SignInForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText("E-mail"), "jana@example.cz")
    await user.type(screen.getByLabelText("Heslo"), "tajneheslo")
    await user.click(screen.getByRole("button", { name: "Přihlásit se" }))
    expect(onSubmit).toHaveBeenLastCalledWith(
      { email: "jana@example.cz", password: "tajneheslo", rememberMe: true },
      expect.anything(),
    )

    await user.click(screen.getByRole("switch", { name: "Zůstat přihlášen" }))
    await user.click(screen.getByRole("button", { name: "Přihlásit se" }))
    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({ rememberMe: false }),
      expect.anything(),
    )
  })

  it("reveals the password on request", async () => {
    const user = userEvent.setup()
    render(
      <SignInForm
        isLoading={false}
        onSubmit={vi.fn()}
      />,
    )

    const password = screen.getByLabelText("Heslo")
    expect(password).toHaveAttribute("type", "password")
    await user.click(screen.getByRole("button", { name: "Zobrazit heslo" }))
    expect(password).toHaveAttribute("type", "text")
  })
})

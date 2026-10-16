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
})

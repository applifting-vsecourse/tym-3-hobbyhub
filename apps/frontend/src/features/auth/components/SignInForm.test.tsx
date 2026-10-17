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
})

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm"

describe("ForgotPasswordForm", () => {
  it("asks for an e-mail before sending", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <ForgotPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Poslat odkaz" }))

    expect(await screen.findByText("Zadejte e-mail")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends the trimmed address", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <ForgotPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText("E-mail"), "  jana@example.com ")
    await user.click(screen.getByRole("button", { name: "Poslat odkaz" }))

    expect(onSubmit).toHaveBeenCalledWith({ email: "jana@example.com" }, expect.anything())
  })
})

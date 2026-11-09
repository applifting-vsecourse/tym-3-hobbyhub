import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm"

describe("ResetPasswordForm", () => {
  it("does not send a password shorter than eight characters", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <ResetPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText("Heslo"), "krátké")
    await user.click(screen.getByRole("button", { name: "Uložit heslo" }))

    expect(await screen.findByText("Heslo musí mít alespoň 8 znaků")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sends a valid password", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <ResetPasswordForm
        isLoading={false}
        onSubmit={onSubmit}
      />,
    )

    await user.type(screen.getByLabelText("Heslo"), "dlouhe-heslo-1")
    await user.click(screen.getByRole("button", { name: "Uložit heslo" }))

    expect(onSubmit).toHaveBeenCalledWith({ password: "dlouhe-heslo-1" }, expect.anything())
  })
})

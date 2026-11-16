import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GoogleButton, type GoogleRegistration } from "@/features/auth/components/GoogleButton"

const { signInSocial } = vi.hoisted(() => ({ signInSocial: vi.fn() }))
vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signIn: { social: signInSocial } },
}))

const registration: GoogleRegistration = {
  gender: "FEMALE",
  birthYear: 1990,
  adulthoodConfirmed: true,
  termsAccepted: true,
}

describe("GoogleButton", () => {
  beforeEach(() => {
    signInSocial.mockReset()
    signInSocial.mockResolvedValue({ data: {}, error: null })
  })

  it("only signs in an existing account on the sign-in page", async () => {
    render(<GoogleButton from="/events/42" />)

    await userEvent.click(screen.getByRole("button", { name: "Pokračovat přes Google" }))

    const body = signInSocial.mock.calls[0]?.[0] as Record<string, unknown>
    expect(body).toMatchObject({ provider: "google" })
    expect(body).not.toHaveProperty("requestSignUp")
    // Back through the sign-in page, which sends on to the event.
    expect(body.callbackURL).toBe(`${window.location.origin}/login?from=%2Fevents%2F42`)
    expect(body.newUserCallbackURL).toBe(`${window.location.origin}/onboarding?from=%2Fevents%2F42`)
    expect(body.errorCallbackURL).toBe(`${window.location.origin}/login?from=%2Fevents%2F42`)
  })

  it("sends the checked registration and asks Google to create the account on sign-up", async () => {
    render(<GoogleButton getRegistration={() => Promise.resolve(registration)} />)

    await userEvent.click(screen.getByRole("button", { name: "Pokračovat přes Google" }))

    expect(signInSocial).toHaveBeenCalledWith(
      expect.objectContaining({
        requestSignUp: true,
        additionalData: registration,
        errorCallbackURL: `${window.location.origin}/signup`,
      }),
    )
  })

  it("does not leave for Google while the registration form is not valid", async () => {
    render(<GoogleButton getRegistration={() => Promise.resolve(null)} />)

    await userEvent.click(screen.getByRole("button", { name: "Pokračovat přes Google" }))

    expect(signInSocial).not.toHaveBeenCalled()
  })

  it("shows what the server refused, e.g. an underage year", async () => {
    signInSocial.mockResolvedValue({ data: null, error: { code: "UNDERAGE", status: 400 } })
    render(<GoogleButton getRegistration={() => Promise.resolve(registration)} />)

    await userEvent.click(screen.getByRole("button", { name: "Pokračovat přes Google" }))

    expect(await screen.findByText("Registrace je možná až od 18 let.")).toBeInTheDocument()
  })
})

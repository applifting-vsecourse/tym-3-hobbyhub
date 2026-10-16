import { describe, expect, it } from "vitest"

import { i18n } from "@/i18n"

import { AuthError, authErrorMessage } from "@/features/auth/lib/authErrors"

describe("authErrorMessage", () => {
  it("translates known BetterAuth codes", () => {
    const error = new AuthError("INVALID_EMAIL_OR_PASSWORD", "Invalid email or password")
    expect(authErrorMessage(i18n.t, error, "signInFailed")).toBe("Nesprávný e-mail nebo heslo.")
  })

  it("translates the registration codes from the backend", () => {
    expect(authErrorMessage(i18n.t, new AuthError("UNDERAGE"), "signUpFailed")).toBe(
      "Registrace je možná až od 18 let.",
    )
  })

  it("explains the rate limit, which has no code", () => {
    expect(
      authErrorMessage(i18n.t, new AuthError(undefined, "Too many requests", 429), "signUpFailed"),
    ).toBe("Příliš mnoho pokusů. Zkuste to prosím za chvíli.")
  })

  it("falls back to a generic message for unknown codes and non-auth errors", () => {
    expect(authErrorMessage(i18n.t, new AuthError("SOMETHING_NEW"), "signUpFailed")).toBe(
      "Registrace se nezdařila.",
    )
    expect(authErrorMessage(i18n.t, new Error("boom"), "signInFailed")).toBe(
      "Přihlášení se nezdařilo.",
    )
  })
})

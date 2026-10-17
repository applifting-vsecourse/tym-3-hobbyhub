import type { TFunction } from "i18next"

// BetterAuth sends English sentences; the stable part is `code`. Known codes
// are translated, anything else falls back to a generic message.
export class AuthError extends Error {
  readonly code: string | undefined

  constructor(code: string | undefined, message?: string) {
    super(message ?? code ?? "Auth error")
    this.code = code
  }
}

export function authErrorMessage(
  t: TFunction,
  error: unknown,
  fallback: "signInFailed" | "signUpFailed",
) {
  const code = error instanceof AuthError ? error.code : undefined

  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return t("auth.errors.invalidCredentials")
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return t("auth.errors.userExists")
    case "USERNAME_IS_ALREADY_TAKEN":
      return t("auth.errors.usernameTaken")
    case "INVALID_USERNAME":
      return t("auth.errors.invalidUsername")
    case "EMAIL_NOT_VERIFIED":
      return t("auth.errors.emailNotVerified")
    case "INVALID_EMAIL":
      return t("auth.errors.invalidEmail")
    case "PASSWORD_TOO_SHORT":
      return t("auth.errors.passwordTooShort")
    default:
      return t(`auth.errors.${fallback}`)
  }
}

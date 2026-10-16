import type { TFunction } from "i18next"

// BetterAuth sends English sentences; the stable part is `code`. Known codes
// are translated, anything else falls back to a generic message.
export class AuthError extends Error {
  readonly code: string | undefined
  readonly status: number | undefined

  constructor(code: string | undefined, message?: string, status?: number) {
    super(message ?? code ?? "Auth error")
    this.code = code
    this.status = status
  }
}

export function authErrorMessage(
  t: TFunction,
  error: unknown,
  fallback: "signInFailed" | "signUpFailed",
) {
  if (!(error instanceof AuthError)) return t(`auth.errors.${fallback}`)
  // The rate limiter answers without a code.
  if (error.status === 429) return t("auth.errors.tooManyRequests")

  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return t("auth.errors.invalidCredentials")
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return t("auth.errors.userExists")
    case "EMAIL_NOT_VERIFIED":
      return t("auth.errors.emailNotVerified")
    case "INVALID_EMAIL":
      return t("auth.errors.invalidEmail")
    case "PASSWORD_TOO_SHORT":
      return t("auth.errors.passwordTooShort")
    // F-03.1 registration rules, checked again by the backend.
    case "UNDERAGE":
      return t("auth.errors.underage")
    case "INVALID_BIRTH_DATE":
      return t("auth.errors.invalidBirthDate")
    case "INVALID_GENDER":
      return t("auth.errors.invalidGender")
    case "TERMS_NOT_ACCEPTED":
      return t("auth.errors.termsNotAccepted")
    default:
      return t(`auth.errors.${fallback}`)
  }
}

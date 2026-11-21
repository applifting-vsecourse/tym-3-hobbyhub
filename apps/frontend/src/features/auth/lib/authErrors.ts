import type { TFunction } from "i18next"

import { NICKNAME_LIMITS } from "@/lib/nickname"

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
  fallback: "signInFailed" | "signUpFailed" | "resetPasswordFailed" | "googleFailed",
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
    case "INVALID_TOKEN":
      return t("auth.errors.invalidToken")
    case "PASSWORD_TOO_SHORT":
      return t("auth.errors.passwordTooShort")
    // F-03.1 registration rules, checked again by the backend.
    case "UNDERAGE":
      return t("auth.errors.underage")
    case "INVALID_BIRTH_YEAR":
      return t("auth.errors.invalidBirthYear")
    case "INVALID_GENDER":
      return t("auth.errors.invalidGender")
    case "TERMS_NOT_ACCEPTED":
      return t("auth.errors.termsNotAccepted")
    case "ADULTHOOD_NOT_CONFIRMED":
      return t("auth.errors.adulthoodNotConfirmed")
    // #212: the nickname. The first four come from the registration hook, the
    // rest from BetterAuth's username plugin, which checks the database.
    case "USERNAME_IS_ALREADY_TAKEN":
      return t("nickname.taken")
    case "NICKNAME_RESERVED":
      return t("nickname.reserved")
    case "NICKNAME_TOO_SHORT":
    case "USERNAME_TOO_SHORT":
      return t("nickname.tooShort", NICKNAME_LIMITS)
    case "NICKNAME_TOO_LONG":
    case "USERNAME_TOO_LONG":
      return t("nickname.tooLong", NICKNAME_LIMITS)
    case "NICKNAME_INVALID":
    case "INVALID_USERNAME":
      return t("nickname.invalid")
    default:
      return t(`auth.errors.${fallback}`)
  }
}

/** The Google account has no account here: sign-up is the way on. */
export const isGoogleSignUpRequired = (code: string | undefined) =>
  code === "GOOGLE_SIGNUP_REQUIRED" ||
  code === "signup_disabled" ||
  code === "new_user_signup_disabled"

/**
 * The message for the `error` code BetterAuth puts on the return address when
 * the Google round trip fails.
 */
export function googleErrorMessage(t: TFunction, code: string) {
  switch (code) {
    // BetterAuth's code for a Google account with no account here, when the
    // sign-in page does not create one: "signup disabled" with spaces turned
    // into underscores. The other spelling is its older/generic-OAuth one.
    case "GOOGLE_SIGNUP_REQUIRED":
    case "signup_disabled":
    case "new_user_signup_disabled":
      return t("auth.errors.googleNoAccount")
    // The nickname was taken while the user was at Google.
    case "USERNAME_IS_ALREADY_TAKEN":
      return t("nickname.taken")
    case "account_not_linked":
    case "unable_to_link_account":
      return t("auth.errors.googleEmailExists")
    default:
      return t("auth.errors.googleFailed")
  }
}

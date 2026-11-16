import { HTTPError } from "@/lib/api-client"
import { BIRTH_YEAR_MESSAGES } from "@/lib/birthYear"

/** A field of the private details the server refused, and why (a translation key). */
export type PrivateDetailsError = {
  field: "gender" | "birthYear"
  message: string
}

// The codes `PUT /profile/private` refuses the details with (ProfileViolation
// on the server). The form checks the same rules before sending, so these come
// only when the two disagree, e.g. the year turned over meanwhile.
const FIELD_OF_CODE: Record<string, PrivateDetailsError> = {
  INVALID_GENDER: { field: "gender", message: "auth.validation.genderRequired" },
  INVALID_BIRTH_YEAR: { field: "birthYear", message: BIRTH_YEAR_MESSAGES.invalid },
  UNDERAGE: { field: "birthYear", message: BIRTH_YEAR_MESSAGES.underage },
}

/**
 * Which fields of the private details a failed save was refused for: empty
 * for any other failure (no connection, a server error, another 400).
 */
export function privateDetailsErrorsOf(error: unknown): PrivateDetailsError[] {
  if (!(error instanceof HTTPError) || error.response.status !== 400) return []
  const data: unknown = error.data
  const message =
    data !== null && typeof data === "object" && "message" in data ? data.message : undefined
  const codes = Array.isArray(message) ? message : [message]
  return codes.flatMap((code) =>
    typeof code === "string" && code in FIELD_OF_CODE ? [FIELD_OF_CODE[code]!] : [],
  )
}

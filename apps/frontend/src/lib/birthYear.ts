// Year of birth for F-03.1. Only the year is collected, never the full date
// (#174, ADR-0016). The form keeps it as the typed text; the server checks the
// same rules (shared/auth/registration on the backend).

export const MIN_AGE = 18
export const OLDEST_BIRTH_YEAR = 1900

const YEAR_PATTERN = /^\d{4}$/

export type BirthYearProblem = "required" | "invalid" | "underage"

/** Translation keys of the messages for each problem. */
export const BIRTH_YEAR_MESSAGES = {
  required: "auth.validation.birthYearRequired",
  invalid: "auth.validation.birthYearInvalid",
  underage: "auth.validation.underage",
} as const satisfies Record<BirthYearProblem, string>

/**
 * What is wrong with a typed year of birth, or null. A four-digit year from
 * 1900 to this year, in which the person turns 18 at the latest. Someone who
 * turns 18 later this year passes: without the day nobody can tell, and the
 * confirmation of adulthood at sign-up covers it.
 */
export function birthYearProblem(value: string, today: Date): BirthYearProblem | null {
  const text = value.trim()
  if (text === "") return "required"
  if (!YEAR_PATTERN.test(text)) return "invalid"
  const year = Number(text)
  const thisYear = today.getFullYear()
  if (year < OLDEST_BIRTH_YEAR || year > thisYear) return "invalid"
  return thisYear - year < MIN_AGE ? "underage" : null
}

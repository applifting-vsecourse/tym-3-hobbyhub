// F-03.1 registration rules on top of BetterAuth's email sign-up: gender, full
// birth date (18+, F-10.3) and consent to the terms. The frontend checks the
// same, but only the server can be trusted.

/** Version of the terms a new user agrees to. Bump it when the text changes. */
export const TERMS_VERSION = '2026-10';

export const MIN_AGE = 18;

export const GENDERS = ['MALE', 'FEMALE'] as const;
export type Gender = (typeof GENDERS)[number];

// Codes the frontend translates (features/auth/lib/authErrors.ts).
export type RegistrationErrorCode =
  'INVALID_GENDER' | 'INVALID_BIRTH_DATE' | 'UNDERAGE' | 'TERMS_NOT_ACCEPTED';

const BIRTH_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const OLDEST_BIRTH_YEAR = 1900;

/**
 * Parses a "YYYY-MM-DD" calendar date into midnight UTC. A plain date and not
 * an ISO timestamp, so the user's time zone cannot shift it by a day.
 * A Date (server-side calls such as the seed) is read by its UTC day.
 * Returns null for anything that is not a real date.
 */
export function parseBirthDate(value: unknown): Date | null {
  const text =
    value instanceof Date && !Number.isNaN(value.getTime())
      ? value.toISOString().slice(0, 10)
      : value;
  if (typeof text !== 'string') return null;
  const match = BIRTH_DATE_PATTERN.exec(text);
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026-02-30 over to March; a real date survives the trip.
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealDate ? date : null;
}

/** Whole years between the birth date and `today`; the birthday itself counts. */
export function ageOn(birthDate: Date, today: Date): number {
  const age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const hadBirthday =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() >= birthDate.getUTCDate());
  return hadBirthday ? age : age - 1;
}

export type RegistrationResult =
  | { ok: true; gender: Gender; birthDate: Date }
  | { ok: false; code: RegistrationErrorCode };

/** Checks the F-03.1 fields of a sign-up body. */
export function validateRegistration(
  body: Record<string, unknown>,
  today: Date,
): RegistrationResult {
  const { gender, birthDate: rawBirthDate, termsAccepted } = body;

  if (!GENDERS.includes(gender as Gender)) {
    return { ok: false, code: 'INVALID_GENDER' };
  }

  const birthDate = parseBirthDate(rawBirthDate);
  if (
    !birthDate ||
    birthDate > today ||
    birthDate.getUTCFullYear() < OLDEST_BIRTH_YEAR
  ) {
    return { ok: false, code: 'INVALID_BIRTH_DATE' };
  }
  if (ageOn(birthDate, today) < MIN_AGE) {
    return { ok: false, code: 'UNDERAGE' };
  }

  if (termsAccepted !== true) {
    return { ok: false, code: 'TERMS_NOT_ACCEPTED' };
  }

  return { ok: true, gender: gender as Gender, birthDate };
}

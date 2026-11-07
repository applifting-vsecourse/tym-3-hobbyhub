// F-03.1 registration rules on top of BetterAuth's email sign-up: gender, year
// of birth (18+, F-10.3), confirmation of adulthood and consent to the terms.
// Only the year is collected, never the full date (#174, ADR-0016). The
// frontend checks the same, but only the server can be trusted.

/** Version of the terms a new user agrees to. Bump it when the text changes. */
export const TERMS_VERSION = '2026-10';

export const MIN_AGE = 18;
export const OLDEST_BIRTH_YEAR = 1900;

export const GENDERS = ['MALE', 'FEMALE'] as const;
export type Gender = (typeof GENDERS)[number];

// Codes the frontend translates (features/auth/lib/authErrors.ts).
export type RegistrationErrorCode =
  | 'INVALID_GENDER'
  | 'INVALID_BIRTH_YEAR'
  | 'UNDERAGE'
  | 'TERMS_NOT_ACCEPTED'
  | 'ADULTHOOD_NOT_CONFIRMED';

// The year is the calendar year in Prague, where the app runs, so the server
// does not move to the new year an hour after the people using it.
const APP_TIME_ZONE = 'Europe/Prague';

/** The calendar year of `at` in Prague. */
export function yearIn(at: Date): number {
  return Number(
    new Intl.DateTimeFormat('en', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
    }).format(at),
  );
}

/**
 * Reads a year of birth: a whole number, as JSON sends it. Returns null for
 * anything else (a string, a fraction, nothing).
 */
export function parseBirthYear(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/**
 * The age someone born in `birthYear` reaches during `year`. Without the day
 * it is exact only after the birthday; before it the person is a year younger.
 */
export function ageInYear(birthYear: number, year: number): number {
  return year - birthYear;
}

/**
 * The F-03.1 rule for the year of birth. A year 1900 to this year; and the
 * person must turn 18 this year at the latest. Someone who turns 18 later this
 * year passes too: without the day nobody can tell, and the confirmation of
 * adulthood at sign-up covers that edge (ADR-0016).
 */
export function birthYearViolation(
  value: unknown,
  today: Date,
): 'INVALID_BIRTH_YEAR' | 'UNDERAGE' | null {
  const birthYear = parseBirthYear(value);
  const thisYear = yearIn(today);
  if (
    birthYear === null ||
    birthYear < OLDEST_BIRTH_YEAR ||
    birthYear > thisYear
  ) {
    return 'INVALID_BIRTH_YEAR';
  }
  return ageInYear(birthYear, thisYear) < MIN_AGE ? 'UNDERAGE' : null;
}

export type RegistrationResult =
  | { ok: true; gender: Gender; birthYear: number }
  | { ok: false; code: RegistrationErrorCode };

/** Checks the F-03.1 fields of a sign-up body. */
export function validateRegistration(
  body: Record<string, unknown>,
  today: Date,
): RegistrationResult {
  const { gender, birthYear, termsAccepted, adulthoodConfirmed } = body;

  if (!GENDERS.includes(gender as Gender)) {
    return { ok: false, code: 'INVALID_GENDER' };
  }

  const birthYearCode = birthYearViolation(birthYear, today);
  if (birthYearCode) return { ok: false, code: birthYearCode };

  if (termsAccepted !== true) {
    return { ok: false, code: 'TERMS_NOT_ACCEPTED' };
  }
  if (adulthoodConfirmed !== true) {
    return { ok: false, code: 'ADULTHOOD_NOT_CONFIRMED' };
  }

  return {
    ok: true,
    gender: gender as Gender,
    birthYear: birthYear as number,
  };
}

/**
 * What an account created by sign-up records about the consents: which terms
 * the user agreed to, and when they confirmed being 18 or older (#174).
 * Only called once `validateRegistration` has accepted both.
 */
export function consentsAtSignUp(now: Date): {
  termsAcceptedAt: Date;
  termsVersion: string;
  adulthoodConfirmedAt: Date;
} {
  return {
    termsAcceptedAt: now,
    termsVersion: TERMS_VERSION,
    adulthoodConfirmedAt: now,
  };
}

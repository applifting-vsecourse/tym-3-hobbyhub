// #212: the nickname is unique (ADR-0025). BetterAuth's username plugin keeps
// it in two columns: `username`, lower-cased, which the unique index compares,
// and `displayUsername`, as the user typed it. `name` is always a copy of
// `displayUsername`, so the rest of the app shows the nickname as before.
// The frontend checks the same rules (src/lib/nickname.ts); the server counts.

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 30;
// The plugin's own default; the migration's CHECK keeps the same.
export const NICKNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

// Nobody may pose as the team or a moderator: a nickname containing any of
// these is refused. Only newly chosen nicknames are checked; the ones the
// migration generated and the seeded ones stay.
export const RESERVED_NICKNAME_WORDS = [
  'admin',
  'administrator',
  'moderator',
  'hobbyhub',
  'support',
  'podpora',
  'superadmin',
  'spravce',
  'system',
] as const;
// Too short to refuse inside other words ("Modrak"), refused on its own.
export const RESERVED_NICKNAMES = ['mod'] as const;
// Ordinary words that happen to contain a reserved one ("badminton" holds
// "admin"). They are taken out before the search, so "BadmintonPetr" passes
// and "BadmintonAdmin" still does not.
export const NICKNAME_WORDS_NOT_RESERVED = ['badminton', 'ecosystem'] as const;

export const NICKNAME_CHANGE_COOLDOWN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type NicknameViolation =
  | 'NICKNAME_TOO_SHORT'
  | 'NICKNAME_TOO_LONG'
  | 'NICKNAME_INVALID'
  | 'NICKNAME_RESERVED';

/** What the unique index compares: the nickname without letter case. */
export function normalizeNickname(nickname: string): string {
  return nickname.toLowerCase();
}

/** The rules for a newly chosen nickname; null when it may be used. */
export function nicknameViolation(value: unknown): NicknameViolation | null {
  if (typeof value !== 'string') return 'NICKNAME_INVALID';
  if (value.length < NICKNAME_MIN_LENGTH) return 'NICKNAME_TOO_SHORT';
  if (value.length > NICKNAME_MAX_LENGTH) return 'NICKNAME_TOO_LONG';
  if (!NICKNAME_PATTERN.test(value)) return 'NICKNAME_INVALID';
  const normalized = normalizeNickname(value);
  const searched = NICKNAME_WORDS_NOT_RESERVED.reduce(
    (rest, word) => rest.split(word).join(' '),
    normalized,
  );
  const isReserved =
    (RESERVED_NICKNAMES as readonly string[]).includes(normalized) ||
    RESERVED_NICKNAME_WORDS.some((word) => searched.includes(word));
  return isReserved ? 'NICKNAME_RESERVED' : null;
}

/**
 * When the user may change the nickname again: 30 days after the last change
 * they made in the profile. Null when they may change it now; the sign-up
 * and the migration do not count as a change.
 */
export function nicknameChangeableFrom(
  lastChangedAt: Date | null,
  now: Date,
): Date | null {
  if (!lastChangedAt) return null;
  const from = new Date(
    lastChangedAt.getTime() + NICKNAME_CHANGE_COOLDOWN_DAYS * DAY_MS,
  );
  return from > now ? from : null;
}

/**
 * The latest moment of the last change that still lets the nickname change
 * at `now`; the save checks it again in the database.
 */
export function nicknamePreviousChangeAtMost(now: Date): Date {
  return new Date(now.getTime() - NICKNAME_CHANGE_COOLDOWN_DAYS * DAY_MS);
}

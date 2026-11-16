// The unique nickname (#212, ADR-0025). The same rules as the server
// (shared/auth/registration/nickname.ts on the backend), which checks them
// again and also whether someone else has the nickname.

export const NICKNAME_MIN_LENGTH = 3
export const NICKNAME_MAX_LENGTH = 30
/** The limits, for the messages that name them. */
export const NICKNAME_LIMITS = { min: NICKNAME_MIN_LENGTH, max: NICKNAME_MAX_LENGTH }
const NICKNAME_PATTERN = /^[a-zA-Z0-9_.]+$/

// A nickname containing any of these is refused, so nobody poses as the team.
const RESERVED_NICKNAME_WORDS = [
  "admin",
  "administrator",
  "moderator",
  "hobbyhub",
  "support",
  "podpora",
  "superadmin",
  "spravce",
  "system",
]
// Too short to refuse inside other words ("Modrak"), refused on its own.
const RESERVED_NICKNAMES = new Set(["mod"])
// Ordinary words that contain a reserved one ("badminton" holds "admin"); they
// are taken out before the search, so "BadmintonPetr" passes.
const WORDS_NOT_RESERVED = ["badminton", "ecosystem"]

export type NicknameProblem = "required" | "tooShort" | "tooLong" | "invalid" | "reserved"

/** Translation keys of the messages for each problem. */
export const NICKNAME_MESSAGES = {
  required: "nickname.required",
  tooShort: "nickname.tooShort",
  tooLong: "nickname.tooLong",
  invalid: "nickname.invalid",
  reserved: "nickname.reserved",
} as const satisfies Record<NicknameProblem, string>

/** What the server compares: the nickname without letter case. */
export const normalizeNickname = (nickname: string) => nickname.toLowerCase()

/** What is wrong with a typed nickname (already trimmed), or null. */
export function nicknameProblem(value: string): NicknameProblem | null {
  if (value === "") return "required"
  if (value.length < NICKNAME_MIN_LENGTH) return "tooShort"
  if (value.length > NICKNAME_MAX_LENGTH) return "tooLong"
  if (!NICKNAME_PATTERN.test(value)) return "invalid"
  const normalized = normalizeNickname(value)
  const searched = WORDS_NOT_RESERVED.reduce((rest, word) => rest.split(word).join(" "), normalized)
  const isReserved =
    RESERVED_NICKNAMES.has(normalized) ||
    RESERVED_NICKNAME_WORDS.some((word) => searched.includes(word))
  return isReserved ? "reserved" : null
}

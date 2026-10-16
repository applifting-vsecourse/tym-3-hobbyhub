import csCommon from "@/i18n/locales/cs/common.json"
import enCommon from "@/i18n/locales/en/common.json"

// Czech is the source of truth: its shape types the keys, and a test checks
// that every other language has exactly the same ones.
export const resources = {
  cs: { common: csCommon },
  en: { common: enCommon },
} as const

export const DEFAULT_LANGUAGE = "cs"

export const LANGUAGES = [
  // Endonyms: a language is always named in itself, so they are not translated.
  { code: "cs", label: "Čeština" },
  { code: "en", label: "English" },
] as const

export type Language = (typeof LANGUAGES)[number]["code"]

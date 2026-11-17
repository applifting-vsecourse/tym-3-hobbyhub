import csCommon from "@/i18n/locales/cs/common.json"
import enCommon from "@/i18n/locales/en/common.json"

// Czech is the source of truth: its shape types the keys, and a test checks
// that every other language has exactly the same ones.
export const resources = {
  cs: { common: csCommon },
  en: { common: enCommon },
} as const

// The source language: the translations are written in it first and it types
// the keys. Not what a visitor gets when the browser asks for something else.
export const DEFAULT_LANGUAGE = "cs"

// #262: what a browser gets when none of its languages is one the app speaks.
// English is understood more widely than Czech.
export const FALLBACK_LANGUAGE = "en"

export const LANGUAGES = [
  // Endonyms: a language is always named in itself, so they are not translated.
  { code: "cs", label: "Čeština" },
  { code: "en", label: "English" },
] as const

export type Language = (typeof LANGUAGES)[number]["code"]

export const isLanguage = (value: unknown): value is Language =>
  LANGUAGES.some(({ code }) => code === value)

/** The language the app shows now, as one of its own codes. */
export const languageOf = (resolved: string | undefined): Language =>
  isLanguage(resolved) ? resolved : FALLBACK_LANGUAGE

// #262: the account keeps the language as the backend's enum.
export type AccountLanguage = "CS" | "EN"

const ACCOUNT_LANGUAGES: Record<Language, AccountLanguage> = { cs: "CS", en: "EN" }

export const toAccountLanguage = (language: Language): AccountLanguage =>
  ACCOUNT_LANGUAGES[language]

/** The app's code for the account's language; null for anything it does not know. */
export const fromAccountLanguage = (value: unknown): Language | null =>
  LANGUAGES.find(({ code }) => ACCOUNT_LANGUAGES[code] === value)?.code ?? null

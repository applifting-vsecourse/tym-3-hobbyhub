export type ContactKind = "email" | "phone"

// No "/" or ":" before the "@", so a link such as https://example.com/@jana.novak is no e-mail.
const EMAIL = /^[^\s@/:]+@[^\s@/]+\.[^\s@/]{2,}$/
/** Digits with an optional leading + and the usual separators. */
const PHONE = /^\+?[0-9][0-9 ()-]{5,}$/
/** A date or a run of dashes is no phone number. */
const PHONE_MIN_DIGITS = 9

/**
 * The organizer's contact is an e-mail or a phone number (the link to a group
 * chat has its own field). Null when it is neither. The server checks the same rules.
 */
export const contactKind = (value: string): ContactKind | null => {
  const text = value.trim()
  if (EMAIL.test(text)) return "email"
  if (PHONE.test(text) && (text.match(/\d/g) ?? []).length >= PHONE_MIN_DIGITS) return "phone"
  return null
}

/** The address a tap on the contact opens: `mailto:` or `tel:`. */
export const contactHref = (value: string, kind: ContactKind): string => {
  const text = value.trim()
  // Digits and a leading plus only, which is what a `tel:` link wants.
  return kind === "email" ? `mailto:${text}` : `tel:${text.replace(/[^+\d]/g, "")}`
}

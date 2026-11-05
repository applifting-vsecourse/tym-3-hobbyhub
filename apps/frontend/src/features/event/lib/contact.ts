export type ContactKind = "email" | "phone" | "link"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** Digits with an optional leading + and the usual separators. */
const PHONE = /^\+?[0-9][0-9 ()-]{5,}$/
const LINK = /^https?:\/\/[^\s/$.?#]\S*$/i

/**
 * The organizer's one contact is an e-mail, a phone number or a web link (a
 * group on Facebook, WhatsApp, Telegram…). Null when it is none of those.
 * The server checks the same rules.
 */
export const contactKind = (value: string): ContactKind | null => {
  const text = value.trim()
  if (EMAIL.test(text)) return "email"
  if (PHONE.test(text)) return "phone"
  if (LINK.test(text)) return "link"
  return null
}

/** The address a tap on the contact opens: `mailto:`, `tel:` or the link itself. */
export const contactHref = (value: string, kind: ContactKind): string => {
  const text = value.trim()
  if (kind === "email") return `mailto:${text}`
  // Digits and a leading plus only, which is what a `tel:` link wants.
  if (kind === "phone") return `tel:${text.replace(/[^+\d]/g, "")}`
  return text
}

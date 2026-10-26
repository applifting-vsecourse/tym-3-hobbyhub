// Dates and times as the form holds them: the `yyyy-mm-dd` and `HH:mm` strings
// of the native inputs, combined in the organizer's local time zone.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^\d{2}:\d{2}$/

/** `null` when either part is missing or malformed. */
export function combineDateTime(date: string, time: string): Date | null {
  if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) return null
  const value = new Date(`${date}T${time}:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

/** The `yyyy-mm-dd` and `HH:mm` of the native inputs, in the local time zone. */
export function splitDateTime(value: Date): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  }
}

/** "čt 15. 10." — the short day of the preview card. */
export function formatEventDay(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).format(date)
}

/** "19:00" */
export function formatEventTime(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date)
}

/** "čtvrtek 15. 10. 2026" — the full date of the detail page. */
export function formatEventDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date)
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/**
 * "čtvrtek 15. 10. 2026, 19:00–20:30", or with the second date when the event
 * ends on another day.
 */
export function formatEventRange(start: Date, end: Date, locale: string) {
  const from = `${formatEventDate(start, locale)}, ${formatEventTime(start, locale)}`
  const to = isSameDay(start, end)
    ? formatEventTime(end, locale)
    : `${formatEventDate(end, locale)}, ${formatEventTime(end, locale)}`
  return `${from}–${to}`
}

export function formatContribution(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount)
}

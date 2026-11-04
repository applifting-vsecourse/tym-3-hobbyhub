// Birth date for F-03.1. The form keeps it as a plain "YYYY-MM-DD" calendar
// date: a Date or an ISO timestamp would shift by a day across time zones.
// The server checks the same rules (shared/auth/registration on the backend).

export const MIN_AGE = 18

const pad = (value: number) => String(value).padStart(2, "0")

/** The calendar day the user picked, as "YYYY-MM-DD" in their own time zone. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local midnight of a "YYYY-MM-DD" date, for the calendar; undefined when invalid. */
export function fromIsoDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const date = new Date(year, month - 1, Number(match[3]))
  return date.getMonth() === month - 1 ? date : undefined
}

/**
 * `date`'s day in the month that `month` falls in, for when the user changes
 * only the month or year. A day the month lacks becomes its last day (31 → 28
 * in February), and nothing goes past `latest`.
 */
export function moveToMonth(date: Date, month: Date, latest: Date): Date {
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const moved = new Date(month.getFullYear(), month.getMonth(), Math.min(date.getDate(), lastDay))
  return moved > latest
    ? new Date(latest.getFullYear(), latest.getMonth(), latest.getDate())
    : moved
}

/** Whether someone born on `birthDate` is at least `MIN_AGE` on `today`; the birthday counts. */
export function isAdult(birthDate: string, today: Date): boolean {
  const date = fromIsoDate(birthDate)
  if (!date) return false
  const adultFrom = new Date(date.getFullYear() + MIN_AGE, date.getMonth(), date.getDate())
  return adultFrom <= today
}

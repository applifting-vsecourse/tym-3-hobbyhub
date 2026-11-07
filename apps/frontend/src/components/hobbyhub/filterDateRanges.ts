export type DateRange = { dateFrom: string; dateTo: string }

// The server reads event days in this zone, so "today" is Prague's too.
const EVENTS_TIME_ZONE = "Europe/Prague"

const pad = (value: number) => String(value).padStart(2, "0")

/** A day as the server takes it (YYYY-MM-DD). */
export const toIsoDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

/** Today's calendar date in Prague, as a local date whose parts can be read plainly. */
const pragueToday = (now: Date) => {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENTS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number)
  return new Date(year!, month! - 1, day)
}

/** From today to the nearest Sunday; on a Sunday, just today. */
export const thisWeekRange = (now: Date = new Date()): DateRange => {
  const today = pragueToday(now)
  const untilSunday = (7 - today.getDay()) % 7
  return { dateFrom: toIsoDay(today), dateTo: toIsoDay(addDays(today, untilSunday)) }
}

/** The nearest Saturday and Sunday; during the weekend, from today to Sunday. */
export const thisWeekendRange = (now: Date = new Date()): DateRange => {
  const today = pragueToday(now)
  const day = today.getDay()
  if (day === 0) return { dateFrom: toIsoDay(today), dateTo: toIsoDay(today) }
  const saturday = addDays(today, Math.max(6 - day, 0))
  return { dateFrom: toIsoDay(saturday), dateTo: toIsoDay(addDays(today, 7 - day)) }
}

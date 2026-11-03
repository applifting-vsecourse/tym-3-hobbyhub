import { formatDate } from "@/lib/date"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * "před 5 min", "před 3 h", "včera"; a date for anything over a week old.
 * Through `Intl`, like every date in the app, so the words follow the locale.
 */
export function relativeTime(date: Date, now: Date, locale: string, justNow: string): string {
  const elapsed = now.getTime() - date.getTime()
  if (elapsed < MINUTE) return justNow
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" })
  if (elapsed < HOUR) return format.format(-Math.floor(elapsed / MINUTE), "minute")
  if (elapsed < DAY) return format.format(-Math.floor(elapsed / HOUR), "hour")
  if (elapsed < 7 * DAY) return format.format(-Math.floor(elapsed / DAY), "day")
  return formatDate(date, locale)
}

import { parseISO } from "date-fns"

export function formatDate(date: string | number | Date, locale: string) {
  const value = typeof date === "string" ? parseISO(date) : date
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(value)
}

import type { TFunction } from "i18next"

import type { EventListItem } from "@/features/event/api/eventSchemas"

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** Short "when" label for the time pill: "Dnes 19:00", "Zítra 10:00", then "čt 22. 10. 19:00". */
export function eventWhen(t: TFunction, startAt: Date, now: Date, locale: string): string {
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(
    startAt,
  )
  if (isSameDay(startAt, now)) return t("events.when.today", { time })

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(startAt, tomorrow)) return t("events.when.tomorrow", { time })

  const date = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).format(startAt)
  return `${date} ${time}`
}

/** Approximate place and level: "ZŠ Kobylisy, Praha 8 · Pokročilí". */
export function eventMeta(t: TFunction, event: EventListItem): string {
  const place =
    event.venueType === "ONLINE"
      ? t("events.online")
      : [event.placeName, event.district ?? event.city].filter(Boolean).join(", ")
  return [place, event.level].filter(Boolean).join(" · ")
}

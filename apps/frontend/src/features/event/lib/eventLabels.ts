import type { TFunction } from "i18next"

import type { EventListItem } from "@/features/event/api/eventSchemas"

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** Start time of an event: "19:00". */
export function eventTime(startAt: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(startAt)
}

/** Day heading of a group of events: "Dnes", "Zítra", then "čtvrtek 29. října". */
export function eventDay(t: TFunction, startAt: Date, now: Date, locale: string): string {
  if (isSameDay(startAt, now)) return t("events.day.today")

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(startAt, tomorrow)) return t("events.day.tomorrow")

  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(
    startAt,
  )
}

/** Activity, approximate place and level: "Florbal · ZŠ Kobylisy, Praha 8 · Pokročilí". */
export function eventMeta(t: TFunction, event: EventListItem, activityLabel: string): string {
  const place =
    event.venueType === "ONLINE"
      ? t("events.online")
      : [event.placeName, event.district ?? event.city].filter(Boolean).join(", ")
  return [activityLabel, place, event.level].filter(Boolean).join(" · ")
}

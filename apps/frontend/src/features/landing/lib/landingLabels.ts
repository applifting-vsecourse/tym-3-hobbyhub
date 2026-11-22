import type { TFunction } from "i18next"

import type { LandingEvent } from "@/features/landing/api/landingSchemas"

// #215: the few labels of the landing cards. They read like the event list's
// (`features/event/lib/eventLabels.ts`), which a feature cannot import.

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** The day alone, short: "Dnes", "Zítra", then "čt 29. 10.". */
export function landingDay(t: TFunction, startAt: Date, now: Date, locale: string): string {
  if (isSameDay(startAt, now)) return t("events.day.today")
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(startAt, tomorrow)) return t("events.day.tomorrow")
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).format(startAt)
}

/** Start time: "19:00". */
export function landingTime(startAt: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(startAt)
}

/** Approximate place: "Online", or "ZŠ Kobylisy, Praha 8"; a hidden address stays vague. */
export function landingPlace(
  t: TFunction,
  event: Pick<LandingEvent, "venueType" | "placeName" | "district" | "city">,
): string {
  return event.venueType === "ONLINE"
    ? t("events.online")
    : [event.placeName, event.district ?? event.city].filter(Boolean).join(", ")
}

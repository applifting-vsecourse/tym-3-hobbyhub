import type { TFunction } from "i18next"

import type { Notification } from "@/features/notification/api/notificationSchemas"

/**
 * Where a notification leads (#152): the organizer to the requests of the
 * event, the applicant to the event, and so on. Always the detail, even of a
 * cancelled event: the page says what happened. Null when there is nowhere
 * to go, e.g. the event was deleted.
 */
export type NotificationTarget =
  | { kind: "eventRequests"; eventId: string }
  | { kind: "eventParticipants"; eventId: string }
  | { kind: "event"; eventId: string }
  | { kind: "groupRequests"; groupId: string }
  | { kind: "group"; groupId: string }
  | { kind: "profile"; userId: string }
  | { kind: "myEvents" }
  | null

export function notificationTarget(notification: Notification): NotificationTarget {
  const { type, event, group, actor } = notification
  // #228: a friend request and its acceptance lead to the other person.
  if (type === "FRIEND_REQUEST" || type === "FRIEND_REQUEST_ACCEPTED") {
    return actor ? { kind: "profile", userId: actor.id } : null
  }
  // #239: a hidden event exists only for its organizers, whose copy carries
  // the reason; everyone else goes to their own events.
  if (type === "EVENT_HIDDEN" && notification.reason === null) return { kind: "myEvents" }
  if (event) {
    if (type === "NEW_REQUESTS") return { kind: "eventRequests", eventId: event.id }
    // #233: the organizers see who is coming.
    if (type === "HOSTED_EVENT_REMINDER") return { kind: "eventParticipants", eventId: event.id }
    return { kind: "event", eventId: event.id }
  }
  if (group) {
    return type === "NEW_REQUESTS"
      ? { kind: "groupRequests", groupId: group.id }
      : { kind: "group", groupId: group.id }
  }
  return null
}

const DAY_MS = 24 * 60 * 60 * 1000

const calendarDay = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS

/**
 * #233: when the event starts, as the reader sees it now: "dnes v 18:00",
 * "zítra v 18:00", "včera v 18:00", else "čt 15. 1. v 18:00". Through `Intl`,
 * so the words follow the locale.
 */
function startsWhen(t: TFunction, startsAt: Date, now: Date, locale: string): string {
  const days = calendarDay(startsAt) - calendarDay(now)
  const day =
    Math.abs(days) <= 1
      ? new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day")
      : new Intl.DateTimeFormat(locale, {
          weekday: "short",
          day: "numeric",
          month: "numeric",
        }).format(startsAt)
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    startsAt,
  )
  return t("notifications.startsWhen", { day, time })
}

type TextOptions = {
  /** Injectable so "zítra" is stable in tests. */
  now?: Date
  locale?: string
}

/**
 * The sentence of a notification in the current language (ADR-0015): the
 * server stores the type and the data, the client writes the words.
 */
export function notificationText(
  t: TFunction,
  notification: Notification,
  { now = new Date(), locale = "cs" }: TextOptions = {},
): string {
  const { type, actor, event, group, decision, changes, reminder } = notification
  const name = actor?.name ?? t("notifications.someone")
  const title = event?.title ?? group?.name ?? t("notifications.deletedTarget")
  const about = event ? "event" : "group"

  switch (type) {
    case "NEW_REQUESTS":
      return t(`notifications.text.NEW_REQUESTS.${about}`, { name, title })
    case "REQUEST_DECIDED":
      return t(`notifications.text.REQUEST_DECIDED.${about}.${decision ?? "APPROVED"}`, { title })
    case "EVENT_CHANGED": {
      const what = changes.includes("TIME") && changes.includes("PLACE") ? "BOTH" : changes[0]
      return t(`notifications.text.EVENT_CHANGED.${what ?? "BOTH"}`, { title })
    }
    case "EVENT_CANCELLED":
      return t("notifications.text.EVENT_CANCELLED", { title })
    case "EVENT_HIDDEN":
      return notification.reason === null
        ? t("notifications.text.EVENT_HIDDEN.participant", { title })
        : t("notifications.text.EVENT_HIDDEN.organizer", { title })
    case "EVENT_RESTORED":
      return t("notifications.text.EVENT_RESTORED", { title })
    case "PARTICIPANT_CANCELLED":
      return t("notifications.text.PARTICIPANT_CANCELLED", { name, title })
    // #240: neither what was reported nor what the administrator did.
    case "REPORT_RESOLVED":
      return t("notifications.text.REPORT_RESOLVED")
    case "EVENT_REMINDER":
    case "HOSTED_EVENT_REMINDER": {
      if (!reminder) return t("notifications.text.other", { title })
      const when = startsWhen(t, reminder.startsAt, now, locale)
      const hasStarted = reminder.startsAt.getTime() <= now.getTime()
      if (type === "EVENT_REMINDER") {
        return t(`notifications.text.EVENT_REMINDER.${hasStarted ? "started" : "upcoming"}`, {
          title,
          when,
        })
      }
      // How full it was belongs to the moment before the start; afterwards
      // the participants page says who came.
      const { occupancy } = reminder
      if (hasStarted || !occupancy) {
        return t("notifications.text.HOSTED_EVENT_REMINDER.started", { title, when })
      }
      const values = {
        title,
        when,
        occupied: occupancy.occupiedSpots,
        capacity: occupancy.maxParticipants,
      }
      return occupancy.missingToMinimum > 0
        ? t("notifications.text.HOSTED_EVENT_REMINDER.belowMinimum", {
            ...values,
            count: occupancy.missingToMinimum,
          })
        : t("notifications.text.HOSTED_EVENT_REMINDER.upcoming", values)
    }
    case "FRIEND_REQUEST":
      return t("notifications.text.FRIEND_REQUEST", { name })
    case "FRIEND_REQUEST_ACCEPTED":
      return t("notifications.text.FRIEND_REQUEST_ACCEPTED", { name })
    default:
      // Types without a trigger yet (F-05.8, F-05.9, F-07.4…): a plain line
      // rather than nothing, should a row of theirs ever appear.
      return t("notifications.text.other", { title })
  }
}

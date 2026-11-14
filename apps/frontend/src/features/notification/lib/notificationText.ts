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
  | { kind: "event"; eventId: string }
  | { kind: "groupRequests"; groupId: string }
  | { kind: "group"; groupId: string }
  | { kind: "myEvents" }
  | null

export function notificationTarget(notification: Notification): NotificationTarget {
  const { type, event, group } = notification
  // #239: a hidden event exists only for its organizers, whose copy carries
  // the reason; everyone else goes to their own events.
  if (type === "EVENT_HIDDEN" && notification.reason === null) return { kind: "myEvents" }
  if (event) {
    return type === "NEW_REQUESTS"
      ? { kind: "eventRequests", eventId: event.id }
      : { kind: "event", eventId: event.id }
  }
  if (group) {
    return type === "NEW_REQUESTS"
      ? { kind: "groupRequests", groupId: group.id }
      : { kind: "group", groupId: group.id }
  }
  return null
}

/**
 * The sentence of a notification in the current language (ADR-0015): the
 * server stores the type and the data, the client writes the words.
 */
export function notificationText(t: TFunction, notification: Notification): string {
  const { type, actor, event, group, decision, changes } = notification
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
    default:
      // Types without a trigger yet (F-05.8, F-05.9, F-07.4…): a plain line
      // rather than nothing, should a row of theirs ever appear.
      return t("notifications.text.other", { title })
  }
}

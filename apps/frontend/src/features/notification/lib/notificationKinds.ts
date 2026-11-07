import type {
  NotificationKind,
  NotificationType,
} from "@/features/notification/api/notificationSchemas"

/**
 * Mirror of the server's NOTIFICATION_TYPES_BY_KIND (#175): which types the
 * page shows under each filter chip. The server filters; this says what the
 * chips mean and keeps the two sides in step through the test.
 */
export const NOTIFICATION_TYPES_BY_KIND = {
  requests: [
    "NEW_REQUESTS",
    "REQUEST_DECIDED",
    "PARTICIPANT_CANCELLED",
    "CONFIRMATION_PROMPT",
    "SPOT_AVAILABLE",
  ],
  events: ["EVENT_CHANGED", "EVENT_CANCELLED", "EVENT_BOARD"],
  groups: ["GROUP_INVITATION"],
  other: ["ONBOARDING_SERIES", "MONTHLY_RECOMMENDATION"],
} as const satisfies Record<NotificationKind, readonly NotificationType[]>

export function notificationKindOf(type: NotificationType): NotificationKind {
  const kinds = Object.keys(NOTIFICATION_TYPES_BY_KIND) as NotificationKind[]
  return (
    kinds.find((kind) =>
      (NOTIFICATION_TYPES_BY_KIND[kind] as readonly NotificationType[]).includes(type),
    ) ?? "other"
  )
}

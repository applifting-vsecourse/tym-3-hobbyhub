import { api } from "@/lib/api-client"

import {
  notificationCountSchema,
  notificationSchema,
  type Notification,
  type NotificationKind,
} from "@/features/notification/api/notificationSchemas"

export async function markNotificationRead(id: string): Promise<Notification> {
  return notificationSchema.parse(await api.post(`notifications/${id}/read`).json())
}

/**
 * Every unread one, or with a kind only the unread ones of that kind (#175).
 * Returns how many were unread until now.
 */
export async function markAllNotificationsRead(kind?: NotificationKind): Promise<number> {
  const response =
    kind === undefined
      ? api.post("notifications/read-all")
      : api.post("notifications/read-all", { searchParams: { kind } })
  return notificationCountSchema.parse(await response.json()).count
}

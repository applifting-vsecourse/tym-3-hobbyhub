import { api } from "@/lib/api-client"

import {
  notificationCountSchema,
  notificationSchema,
  type Notification,
} from "@/features/notification/api/notificationSchemas"

export async function markNotificationRead(id: string): Promise<Notification> {
  return notificationSchema.parse(await api.post(`notifications/${id}/read`).json())
}

/** Returns how many were unread until now. */
export async function markAllNotificationsRead(): Promise<number> {
  return notificationCountSchema.parse(await api.post("notifications/read-all").json()).count
}

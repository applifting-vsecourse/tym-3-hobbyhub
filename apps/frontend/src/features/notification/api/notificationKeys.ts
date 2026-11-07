import type { NotificationKind } from "@/features/notification/api/notificationSchemas"

/** Which notifications a list holds (#175); without a field, all of them. */
export type NotificationListFilter = {
  read?: boolean
  kind?: NotificationKind
}

export const notificationKeys = {
  all: () => ["notifications"] as const,
  // Every variant of the list sits under this prefix, so marking something
  // read refreshes the bell and both sections of the page at once.
  lists: () => [...notificationKeys.all(), "list"] as const,
  // One list, newest first, a page at a time: the bell's unread ones, the
  // page's "Nové" and "Přečtené", each for the chosen kind.
  list: (filter: NotificationListFilter = {}) => [...notificationKeys.lists(), filter] as const,
  // The number on the bell.
  unreadCount: () => [...notificationKeys.all(), "unread-count"] as const,
}

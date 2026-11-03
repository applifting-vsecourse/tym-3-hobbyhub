export const notificationKeys = {
  all: () => ["notifications"] as const,
  // The list, newest first, a page at a time; the bell and the page share it.
  list: () => [...notificationKeys.all(), "list"] as const,
  // The number on the bell.
  unreadCount: () => [...notificationKeys.all(), "unread-count"] as const,
}

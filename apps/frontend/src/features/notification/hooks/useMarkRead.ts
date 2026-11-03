import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notification/api/markRead"
import { notificationKeys } from "@/features/notification/api/notificationKeys"

/**
 * After marking read, the list and the number on the bell are fetched again;
 * after a failure too, in case the server did it and only the answer was lost.
 */
function useRefreshNotifications() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: notificationKeys.all() })
}

export function useMarkNotificationRead() {
  const refresh = useRefreshNotifications()
  return useMutation({ mutationFn: markNotificationRead, onSettled: refresh })
}

export function useMarkAllNotificationsRead() {
  const refresh = useRefreshNotifications()
  return useMutation({ mutationFn: markAllNotificationsRead, onSettled: refresh })
}

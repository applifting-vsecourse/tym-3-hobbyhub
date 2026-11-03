import { useInfiniteQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { Notification } from "@/features/notification/api/notificationSchemas"
import { notificationsQueryOptions } from "@/features/notification/api/notificationsQueryOptions"
import { NotificationItem } from "@/features/notification/components/NotificationItem"
import { useMarkNotificationRead } from "@/features/notification/hooks/useMarkRead"

type NotificationListProps = {
  /** The bell shows the first page only; the page loads more. */
  hasMorePages?: boolean
  /** Called after a notification was opened, e.g. to close the bell. */
  onOpen?: () => void
  /** Injectable so "před 5 min" is stable in tests. */
  now?: Date
}

/**
 * The notifications, newest first, with the three states every list has.
 * Opening one marks it read; the link itself takes the user where it leads.
 */
export function NotificationList({ hasMorePages = false, onOpen, now }: NotificationListProps) {
  const { t } = useTranslation()
  const query = useInfiniteQuery(notificationsQueryOptions())
  const markRead = useMarkNotificationRead()

  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0

  const open = (notification: Notification) => {
    if (notification.readAt === null) markRead.mutate(notification.id)
    onOpen?.()
  }

  if (query.isPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t("notifications.loading")}
        />
      </div>
    )
  }
  if (query.isError && items.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("notifications.loadError")}</AlertTitle>
        <AlertDescription className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            {t("notifications.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  if (items.length === 0) {
    return <p className="px-3 py-6 typo-body text-muted-foreground">{t("notifications.empty")}</p>
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col">
        {items.map((notification) => (
          <li key={notification.id}>
            <NotificationItem
              notification={notification}
              onOpen={open}
              now={now}
            />
          </li>
        ))}
      </ul>
      {hasMorePages && query.isFetchNextPageError ? (
        // A later page failed: keep what is loaded and retry just that page.
        <Alert variant="destructive">
          <AlertTitle>{t("notifications.loadError")}</AlertTitle>
          <AlertDescription className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.fetchNextPage()}
            >
              {t("notifications.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : hasMorePages && query.hasNextPage ? (
        <Button
          variant="outline"
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("notifications.more", { count: total - items.length })}
        </Button>
      ) : null}
    </div>
  )
}

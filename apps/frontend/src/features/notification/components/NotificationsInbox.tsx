import { useId, type ReactNode } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Loader } from "@/components/hobbyhub/Loader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { NotificationListFilter } from "@/features/notification/api/notificationKeys"
import type { NotificationKind } from "@/features/notification/api/notificationSchemas"
import {
  notificationsQueryOptions,
  unreadCountQueryOptions,
} from "@/features/notification/api/notificationsQueryOptions"
import { NotificationKindFilter } from "@/features/notification/components/NotificationKindFilter"
import { NotificationList } from "@/features/notification/components/NotificationList"
import { useMarkAllNotificationsRead } from "@/features/notification/hooks/useMarkRead"

type NotificationsInboxProps = {
  /** The chosen filter chip; all kinds without it. */
  kind?: NotificationKind
  /** Injectable so "před 5 min" is stable in tests. */
  now?: Date
}

function InboxSection({
  title,
  badge,
  children,
}: {
  title: string
  badge?: ReactNode
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2"
    >
      <h2
        id={headingId}
        className="flex items-center gap-2 px-3 typo-h3 text-foreground"
      >
        {title}
        {/* Keeps the title and the count apart in the heading's name. */}
        {badge ? <> {badge}</> : null}
      </h2>
      {children}
    </section>
  )
}

/**
 * The notification page (#152, #175): the filter chips, then "Nové" above
 * "Přečtené", each section paged on its own. Opening a new one marks it read,
 * and the refetch after it moves it to "Přečtené".
 */
export function NotificationsInbox({ kind, now }: NotificationsInboxProps) {
  const { t } = useTranslation()
  const unreadFilter: NotificationListFilter = { read: false, kind }
  const readFilter: NotificationListFilter = { read: true, kind }
  // The same queries the two lists run; read here for the count at "Nové"
  // and for one loader while both load.
  const unread = useInfiniteQuery(notificationsQueryOptions(unreadFilter))
  const read = useInfiniteQuery(notificationsQueryOptions(readFilter))
  const unreadCount = useQuery(unreadCountQueryOptions())
  const markAll = useMarkAllNotificationsRead()
  const newTotal = unread.data?.pages[0]?.total ?? 0
  const scope = kind === undefined ? "empty" : "emptyFiltered"

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 md:py-12">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="typo-h1 text-foreground">{t("notifications.title")}</h1>
          {(unreadCount.data?.count ?? 0) > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-11 md:h-9"
              disabled={markAll.isPending}
              onClick={() =>
                markAll.mutate(undefined, {
                  onError: () => toast.error(t("notifications.markAllReadFailed")),
                })
              }
            >
              {t("notifications.markAllRead")}
            </Button>
          ) : null}
        </div>
        <NotificationKindFilter active={kind} />
      </div>
      {unread.isPending || read.isPending ? (
        <div className="flex justify-center py-8">
          <Loader
            variant="player"
            label={t("notifications.loading")}
          />
        </div>
      ) : (
        <>
          <InboxSection
            title={t("notifications.sections.new.title")}
            badge={
              newTotal > 0 ? (
                <Badge variant="secondary">
                  <span aria-hidden>{newTotal}</span>
                  <span className="sr-only">
                    {t("notifications.sections.new.count", { count: newTotal })}
                  </span>
                </Badge>
              ) : null
            }
          >
            <NotificationList
              filter={unreadFilter}
              empty={t(`notifications.sections.new.${scope}`)}
              hasMorePages
              now={now}
            />
          </InboxSection>
          <InboxSection title={t("notifications.sections.read.title")}>
            <NotificationList
              filter={readFilter}
              empty={t(`notifications.sections.read.${scope}`)}
              hasMorePages
              now={now}
            />
          </InboxSection>
        </>
      )}
    </div>
  )
}

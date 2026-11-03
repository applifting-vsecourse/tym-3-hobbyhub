import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import type { Notification } from "@/features/notification/api/notificationSchemas"
import {
  notificationTarget,
  notificationText,
  type NotificationTarget,
} from "@/features/notification/lib/notificationText"
import { relativeTime } from "@/features/notification/lib/relativeTime"

type NotificationItemProps = {
  notification: Notification
  /** Called on a click, before the link navigates: marks it read, closes the bell. */
  onOpen?: (notification: Notification) => void
  /** Injectable so "před 5 min" is stable in tests. */
  now?: Date
}

const rowClassName =
  "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"

// Each target is its own `Link`, so the router checks the params and search
// of every page the notifications can lead to.
function TargetLink({
  target,
  className,
  onClick,
  children,
}: {
  target: NonNullable<NotificationTarget>
  className: string
  onClick: () => void
  children: ReactNode
}) {
  switch (target.kind) {
    case "eventRequests":
      return (
        <Link
          to="/events/$eventId/participants"
          params={{ eventId: target.eventId }}
          search={{ tab: "requests" }}
          className={className}
          onClick={onClick}
        >
          {children}
        </Link>
      )
    case "event":
      return (
        <Link
          to="/events/$eventId"
          params={{ eventId: target.eventId }}
          className={className}
          onClick={onClick}
        >
          {children}
        </Link>
      )
    case "groupRequests":
      return (
        <Link
          to="/groups/$groupId/members"
          params={{ groupId: target.groupId }}
          search={{ tab: "requests" }}
          className={className}
          onClick={onClick}
        >
          {children}
        </Link>
      )
    case "group":
      return (
        <Link
          to="/groups/$groupId"
          params={{ groupId: target.groupId }}
          className={className}
          onClick={onClick}
        >
          {children}
        </Link>
      )
  }
}

/** One row of the bell and of the page: the sentence, the organizer's words, when. */
export function NotificationItem({
  notification,
  onOpen,
  now = new Date(),
}: NotificationItemProps) {
  const { t, i18n } = useTranslation()
  const isUnread = notification.readAt === null
  const target = notificationTarget(notification)

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "mt-2 size-2 shrink-0 rounded-full",
          isUnread ? "bg-primary" : "bg-transparent",
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cn(
            "typo-body break-words",
            isUnread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {isUnread ? <span className="sr-only">{t("notifications.unread")} </span> : null}
          {notificationText(t, notification)}
        </span>
        {notification.message ? (
          <span className="typo-small break-words whitespace-pre-line text-muted-foreground">
            {t("notifications.message", { message: notification.message })}
          </span>
        ) : null}
        <span className="typo-caption text-muted-foreground">
          {relativeTime(notification.createdAt, now, i18n.language, t("notifications.justNow"))}
        </span>
      </span>
    </>
  )

  if (!target) {
    return <div className={rowClassName}>{body}</div>
  }
  return (
    <TargetLink
      target={target}
      className={rowClassName}
      onClick={() => onOpen?.(notification)}
    >
      {body}
    </TargetLink>
  )
}

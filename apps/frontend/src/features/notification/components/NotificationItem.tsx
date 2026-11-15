import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"
import { relativeTime } from "@/lib/relativeTime"
import { cn } from "@/lib/utils"

import type { Notification } from "@/features/notification/api/notificationSchemas"
import { useDecideFriendRequest } from "@/features/notification/hooks/useDecideFriendRequest"
import {
  notificationTarget,
  notificationText,
  type NotificationTarget,
} from "@/features/notification/lib/notificationText"

type NotificationItemProps = {
  notification: Notification
  /** Called on a click, before the link navigates: marks it read, closes the bell. */
  onOpen?: (notification: Notification) => void
  /** Injectable so "před 5 min" is stable in tests. */
  now?: Date
}

const rowClassName =
  "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring"

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
    case "eventParticipants":
      return (
        <Link
          to="/events/$eventId/participants"
          params={{ eventId: target.eventId }}
          search={{ tab: "participants" }}
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
    case "profile":
      return (
        <Link
          to="/profile/$userId"
          params={{ userId: target.userId }}
          className={className}
          onClick={onClick}
        >
          {children}
        </Link>
      )
  }
}

/**
 * #228: "Přijmout" / "Zamítnout" under a friend request still waiting; once
 * it is decided, wherever, what became of it. A withdrawn one has no
 * notification any more.
 */
function FriendRequestActions({
  senderId,
  senderName,
  status,
}: {
  senderId: string
  senderName: string
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN"
}) {
  const { t } = useTranslation()
  const decide = useDecideFriendRequest(senderId)
  const deciding = decide.isPending ? decide.variables : undefined

  if (status === "ACCEPTED" || status === "REJECTED") {
    return (
      <Badge
        variant={status === "ACCEPTED" ? "success" : "secondary"}
        className="w-fit"
      >
        {status === "ACCEPTED" ? <Check aria-hidden /> : null}
        {t(`notifications.friendRequest.${status}`)}
      </Badge>
    )
  }
  if (status !== "PENDING") return null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="max-md:h-11"
          aria-label={t("friends.requests.acceptLabel", { name: senderName })}
          disabled={decide.isPending}
          onClick={() => decide.mutate("accept")}
        >
          <Check aria-hidden />
          {deciding === "accept" ? t("friends.requests.accepting") : t("friends.requests.accept")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="max-md:h-11"
          aria-label={t("friends.requests.rejectLabel", { name: senderName })}
          disabled={decide.isPending}
          onClick={() => decide.mutate("reject")}
        >
          <X aria-hidden />
          {deciding === "reject" ? t("friends.requests.rejecting") : t("friends.requests.reject")}
        </Button>
      </div>
      {decide.isError ? (
        <p
          role="alert"
          className="typo-small text-destructive"
        >
          {t(
            decide.error instanceof HTTPError && decide.error.response.status === 404
              ? "friends.requests.unavailable"
              : "friends.requests.decideError",
          )}
        </p>
      ) : null}
    </div>
  )
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
          {notificationText(t, notification, { now, locale: i18n.language })}
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

  // #228: a friend request holds buttons, which cannot sit inside a link:
  // the sentence alone leads to the person, the buttons sit under it.
  if (notification.type === "FRIEND_REQUEST" && notification.friendRequest && notification.actor) {
    return (
      <div className="flex w-full items-start gap-3 rounded-md px-3 py-2">
        <span
          aria-hidden
          className={cn(
            "mt-2 size-2 shrink-0 rounded-full",
            isUnread ? "bg-primary" : "bg-transparent",
          )}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          {target ? (
            <TargetLink
              target={target}
              className={cn(
                "w-fit rounded-sm typo-body break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring",
                isUnread ? "text-foreground" : "text-muted-foreground",
              )}
              onClick={() => onOpen?.(notification)}
            >
              {isUnread ? <span className="sr-only">{t("notifications.unread")} </span> : null}
              {notificationText(t, notification)}
            </TargetLink>
          ) : null}
          <FriendRequestActions
            senderId={notification.actor.id}
            senderName={notification.actor.name}
            status={notification.friendRequest.status}
          />
          <span className="typo-caption text-muted-foreground">
            {relativeTime(notification.createdAt, now, i18n.language, t("notifications.justNow"))}
          </span>
        </span>
      </div>
    )
  }

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

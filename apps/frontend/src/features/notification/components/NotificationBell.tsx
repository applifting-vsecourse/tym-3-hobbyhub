import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Bell } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"

import { unreadCountQueryOptions } from "@/features/notification/api/notificationsQueryOptions"
import { NotificationList } from "@/features/notification/components/NotificationList"
import { useMarkAllNotificationsRead } from "@/features/notification/hooks/useMarkRead"

/** Above this the badge stops counting. */
const BADGE_MAX = 99

/**
 * Zvoneček (#152): the number of unread notifications in the header, and on a
 * click the latest ones — a popover from `md`, a bottom drawer on phones —
 * with a way to the page with all of them.
 */
export function NotificationBell() {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [isOpen, setIsOpen] = useState(false)
  const unread = useQuery(unreadCountQueryOptions())
  const markAll = useMarkAllNotificationsRead()
  const count = unread.data?.count ?? 0
  const close = () => setIsOpen(false)

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={count > 0 ? t("notifications.bellUnread", { count }) : t("notifications.bell")}
      className="relative rounded-full"
    >
      <Bell
        aria-hidden
        className="size-5"
      />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 typo-caption text-primary-foreground"
        >
          {count > BADGE_MAX ? t("notifications.badgeOverflow", { max: BADGE_MAX }) : count}
        </span>
      ) : null}
    </Button>
  )

  const markAllButton =
    count > 0 ? (
      <Button
        variant="ghost"
        size="sm"
        disabled={markAll.isPending}
        onClick={() =>
          markAll.mutate(undefined, {
            onError: () => toast.error(t("notifications.markAllReadFailed")),
          })
        }
      >
        {t("notifications.markAllRead")}
      </Button>
    ) : null

  const showAll = (
    <Button
      asChild
      variant="outline"
      className="w-full"
    >
      <Link
        to={ROUTES.notifications}
        onClick={close}
      >
        {t("notifications.showAll")}
      </Link>
    </Button>
  )

  if (isDesktop) {
    return (
      <Popover
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex w-96 flex-col gap-3 p-3"
        >
          <div className="flex items-center justify-between gap-3 px-3">
            <h2 className="typo-h3 text-foreground">{t("notifications.title")}</h2>
            {markAllButton}
          </div>
          {isOpen ? (
            <div className="max-h-[60vh] overflow-y-auto">
              <NotificationList onOpen={close} />
            </div>
          ) : null}
          {showAll}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle>{t("notifications.title")}</DrawerTitle>
            {markAllButton}
          </div>
        </DrawerHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-2 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {isOpen ? <NotificationList onOpen={close} /> : null}
          <div className="px-3">{showAll}</div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

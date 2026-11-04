import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { unreadCountQueryOptions } from "@/features/notification/api/notificationsQueryOptions"
import { NotificationList } from "@/features/notification/components/NotificationList"
import { useMarkAllNotificationsRead } from "@/features/notification/hooks/useMarkRead"

export const Route = createFileRoute("/_ProtectedPages/notifications")({
  component: NotificationsPage,
})

// All of the signed-in user's notifications (#152), where the bell's
// "Zobrazit vše" leads. Newest first, more on request.
function NotificationsPage() {
  const { t } = useTranslation()
  const unread = useQuery(unreadCountQueryOptions())
  const markAll = useMarkAllNotificationsRead()

  return (
    <>
      <Seo title={t("notifications.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="typo-h1 text-foreground">{t("notifications.title")}</h1>
          {(unread.data?.count ?? 0) > 0 ? (
            <Button
              variant="outline"
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
          ) : null}
        </div>
        <NotificationList hasMorePages />
      </section>
    </>
  )
}

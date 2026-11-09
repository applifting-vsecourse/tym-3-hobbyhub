import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/Seo"

import { NotificationsInbox } from "@/features/notification/components/NotificationsInbox"
import { notificationsSearchSchema } from "@/features/notification/lib/notificationsSearch"

export const Route = createFileRoute("/_ProtectedPages/notifications")({
  component: NotificationsPage,
  validateSearch: notificationsSearchSchema,
})

// All of the signed-in user's notifications (#152), where the bell's
// "Zobrazit vše" leads: new and read apart, filtered by kind (#175).
function NotificationsPage() {
  const { t } = useTranslation()
  const { kind } = Route.useSearch()

  return (
    <>
      <Seo title={t("notifications.title")} />
      <NotificationsInbox kind={kind} />
    </>
  )
}

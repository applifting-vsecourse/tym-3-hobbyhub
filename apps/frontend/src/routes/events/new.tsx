import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"

export const Route = createFileRoute("/events/new")({
  component: NewEventPage,
})

// Placeholder: ROUTES.newEvent is linked from the landing page, and without its
// own route `/events/new` would open as the detail of an event called "new".
function NewEventPage() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("events.new.title")} />
      <Header userMenu={<HeaderMenu />} />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("events.new.title")}</h1>
        <p className="mt-2 typo-body text-muted-foreground">{t("events.new.placeholder")}</p>
      </main>
    </>
  )
}

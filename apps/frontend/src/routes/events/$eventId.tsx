import { createFileRoute, Link } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Header } from "@/components/Header/Header"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetailPage,
})

// Placeholder so a click in the list lands somewhere; the detail is F-02.4.
function EventDetailPage() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("events.detail.title")} />
      <Header userMenu={<HeaderMenu />} />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 md:py-12">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="mb-4 rounded-full md:hidden"
        >
          <Link
            to={ROUTES.events}
            aria-label={t("events.detail.back")}
          >
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <h1 className="typo-h1 text-foreground">{t("events.detail.title")}</h1>
        <p className="mt-2 typo-body text-muted-foreground">{t("events.detail.placeholder")}</p>
      </main>
    </>
  )
}

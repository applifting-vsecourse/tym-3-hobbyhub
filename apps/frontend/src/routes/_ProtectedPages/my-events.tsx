import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/Seo"

export const Route = createFileRoute("/_ProtectedPages/my-events")({
  component: MyEventsPage,
})

// Holds the navigation's place until the overview of requests (F-06.3 #41)
// and hosted events (F-05.6 #31) fills it.
function MyEventsPage() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("myEvents.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("myEvents.title")}</h1>
        <p className="mt-4 typo-body text-muted-foreground">{t("myEvents.placeholder")}</p>
      </section>
    </>
  )
}

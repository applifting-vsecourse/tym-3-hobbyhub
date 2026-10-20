import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/Seo"

import { AppShell } from "@/features/auth/components/AppShell"

export const Route = createFileRoute("/terms")({
  component: TermsPage,
})

// Registration links here (F-03.1). The wording itself comes from the operator;
// until then the page only holds its place.
function TermsPage() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("terms.title")} />
      <AppShell className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="typo-h1 text-foreground">{t("terms.title")}</h1>
        <p className="mt-4 typo-body text-muted-foreground">{t("terms.placeholder")}</p>
      </AppShell>
    </>
  )
}

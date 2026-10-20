import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/Seo"

export const Route = createFileRoute("/_ProtectedPages/profile")({
  component: ProfilePage,
})

// Holds the navigation's place until Můj profil (F-04.1 #18) fills it.
function ProfilePage() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("profile.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("profile.title")}</h1>
        <p className="mt-4 typo-body text-muted-foreground">{t("profile.placeholder")}</p>
      </section>
    </>
  )
}

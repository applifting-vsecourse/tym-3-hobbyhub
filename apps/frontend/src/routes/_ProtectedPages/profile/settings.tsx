import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { Seo } from "@/components/Seo"

import { AppSettingsForm } from "@/features/auth/components/AppSettingsForm"

export const Route = createFileRoute("/_ProtectedPages/profile/settings")({
  component: SettingsPage,
})

// #262: language and theme, out of the header.
function SettingsPage() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("settings.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-page py-6 md:py-12">
        <div className="flex flex-col gap-2">
          <BackLink
            to={ROUTES.profile}
            label={t("settings.back")}
          />
          <h1 className="typo-h1 text-foreground">{t("settings.title")}</h1>
          <p className="typo-body text-muted-foreground">{t("settings.description")}</p>
        </div>
        <AppSettingsForm />
      </section>
    </>
  )
}

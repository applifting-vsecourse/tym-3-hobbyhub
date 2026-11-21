import { useId } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/** #262: the way from one's own profile to the language and theme. */
export function AppSettingsSection() {
  const { t } = useTranslation()
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t border-border pt-6"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="typo-h3 text-foreground"
        >
          {t("profile.settings.title")}
        </h2>
        <p className="typo-small text-muted-foreground">{t("profile.settings.description")}</p>
      </div>
      <Button
        asChild
        variant="outline"
        className="self-start max-md:h-11"
      >
        <Link to={ROUTES.settings}>{t("profile.settings.action")}</Link>
      </Button>
    </section>
  )
}

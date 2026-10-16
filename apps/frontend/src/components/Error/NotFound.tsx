import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

export function NotFound() {
  const { t } = useTranslation()

  return (
    <ErrorLayout
      title={t("errors.notFound.title")}
      description={t("errors.notFound.description")}
      action={
        <Button asChild>
          <Link to={ROUTES.home}>{t("errors.notFound.goHome")}</Link>
        </Button>
      }
    />
  )
}

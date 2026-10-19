import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_ProtectedPages/groups/")({
  component: GroupsPage,
})

// Skeleton of the group list (F-07.8 #95): for now only the way to create one.
function GroupsPage() {
  const { t } = useTranslation()

  return (
    <>
      <Seo title={t("groups.list.title")} />
      <section className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="typo-h1 text-foreground">{t("groups.list.title")}</h1>
          <Button asChild>
            <Link to={ROUTES.newGroup}>{t("groups.list.create")}</Link>
          </Button>
        </div>
        <p className="mt-8 typo-body text-muted-foreground">{t("groups.list.empty")}</p>
      </section>
    </>
  )
}

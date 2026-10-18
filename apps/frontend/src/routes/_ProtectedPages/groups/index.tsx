import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { activityName } from "@/features/activity/activityName"
import { DiscoverGroups } from "@/features/group/components/DiscoverGroups"
import type { ActivityLabel } from "@/features/group/components/GroupCard"
import { GroupTabs } from "@/features/group/components/GroupTabs"
import { MyGroups } from "@/features/group/components/MyGroups"

const groupsSearchSchema = z.object({
  // "Moje skupiny" is the default and has no param; anything unknown falls back to it.
  tab: z.enum(["discover"]).optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/groups/")({
  component: GroupsPage,
  validateSearch: groupsSearchSchema,
})

// Seznam skupin (F-07.8 #95).
function GroupsPage() {
  const { t } = useTranslation()
  const { tab = "mine" } = Route.useSearch()
  const activityLabel: ActivityLabel = (activity) => activityName(t, activity)

  return (
    <>
      <Seo title={t("groups.list.title")} />
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="typo-h1 text-foreground">{t("groups.list.title")}</h1>
          <Button asChild>
            <Link to={ROUTES.newGroup}>{t("groups.list.create")}</Link>
          </Button>
        </div>
        <GroupTabs active={tab} />
        {tab === "discover" ? (
          <DiscoverGroups activityLabel={activityLabel} />
        ) : (
          <MyGroups activityLabel={activityLabel} />
        )}
      </section>
    </>
  )
}

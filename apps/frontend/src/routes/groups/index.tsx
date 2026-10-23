import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { activityName } from "@/features/activity/activityName"
import { AppShell } from "@/features/auth/components/AppShell"
import { useSession } from "@/features/auth/hooks/useSession"
import { DiscoverGroups } from "@/features/group/components/DiscoverGroups"
import type { ActivityLabel } from "@/features/group/components/GroupCard"
import { GroupTabs } from "@/features/group/components/GroupTabs"
import { MyGroups } from "@/features/group/components/MyGroups"

const groupsSearchSchema = z.object({
  // "Moje skupiny" is the default and has no param; anything unknown falls back to it.
  tab: z.enum(["discover"]).optional().catch(undefined),
})

export const Route = createFileRoute("/groups/")({
  component: GroupsPage,
  validateSearch: groupsSearchSchema,
})

// Seznam skupin (F-07.8 #95). Public: a visitor sees the public groups only,
// without the tabs; "Nová skupina" sends them to sign in first.
function GroupsPage() {
  const { t } = useTranslation()
  const { tab = "mine" } = Route.useSearch()
  const { user, isPending: isSessionPending } = useSession()
  const activityLabel: ActivityLabel = (activity) => activityName(t, activity)

  return (
    <>
      <Seo title={t("groups.list.title")} />
      <AppShell className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="typo-h1 text-foreground">{t("groups.list.title")}</h1>
          <Button asChild>
            <Link to={ROUTES.newGroup}>{t("groups.list.create")}</Link>
          </Button>
        </div>
        {isSessionPending ? (
          <div className="flex justify-center py-8">
            <Loader
              variant="player"
              label={t("groups.list.loading")}
            />
          </div>
        ) : user ? (
          <>
            <GroupTabs active={tab} />
            {tab === "discover" ? (
              <DiscoverGroups
                viewerId={user.id}
                activityLabel={activityLabel}
              />
            ) : (
              <MyGroups activityLabel={activityLabel} />
            )}
          </>
        ) : (
          <DiscoverGroups
            viewerId={null}
            activityLabel={activityLabel}
          />
        )}
      </AppShell>
    </>
  )
}

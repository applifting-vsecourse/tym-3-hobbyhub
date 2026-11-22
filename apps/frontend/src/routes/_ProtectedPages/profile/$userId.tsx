import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { activityName } from "@/features/activity/activityName"
import { useSession } from "@/features/auth/hooks/useSession"
import { PersonEvents } from "@/features/event/components/PersonEvents"
import { FriendRelationAction } from "@/features/friendship/components/FriendRelationAction"
import { PublicProfilePage } from "@/features/profile/components/PublicProfilePage"
import { ReportAction } from "@/features/report/components/ReportAction"
import { BlockUserAction } from "@/features/user-block/components/BlockUserAction"

// #226: which part of a friend's events, the upcoming ones without a param.
const profileSearchSchema = z.object({
  events: z.enum(["past"]).optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/profile/$userId")({
  component: ProfileRoute,
  validateSearch: profileSearchSchema,
})

function ProfileRoute() {
  const { t } = useTranslation()
  const { userId } = Route.useParams()
  const { events: period = "upcoming" } = Route.useSearch()
  const { user } = useSession()
  // A stable function, so the list is not rebuilt on every render.
  const activityLabel = useCallback(
    (activity: { name: string; icon: string }) => activityName(t, activity),
    [t],
  )

  return (
    <PublicProfilePage
      userId={userId}
      ownUserId={user?.id}
      activityLabel={activityLabel}
      // #225: ask for friendship, or see where the request stands.
      renderFriendAction={(friendship) => <FriendRelationAction {...friendship} />}
      // #65: the person's own block, one way, without the administration.
      blockAction={(profile) => <BlockUserAction user={profile} />}
      // #226: a friend's events, the parts they let friends see.
      renderEvents={(profile) => (
        <PersonEvents
          userId={profile.id}
          pages={{ upcoming: profile.upcomingEvents, past: profile.pastEvents }}
          loadedAt={profile.loadedAt}
          period={period}
          activityLabel={activityLabel}
        />
      )}
      // #240: a report of a person also asks for the two to be blocked.
      reportAction={(profile) => (
        <ReportAction
          target={{ type: "USER", id: profile.id }}
          targetName={profile.name}
        />
      )}
    />
  )
}

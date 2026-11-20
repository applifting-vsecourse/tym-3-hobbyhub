import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { activityName } from "@/features/activity/activityName"
import { useSession } from "@/features/auth/hooks/useSession"
import { FriendRelationAction } from "@/features/friendship/components/FriendRelationAction"
import { PublicProfilePage } from "@/features/profile/components/PublicProfilePage"
import { ReportAction } from "@/features/report/components/ReportAction"
import { BlockUserAction } from "@/features/user-block/components/BlockUserAction"

export const Route = createFileRoute("/_ProtectedPages/profile/$userId")({
  component: ProfileRoute,
})

function ProfileRoute() {
  const { t } = useTranslation()
  const { userId } = Route.useParams()
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

import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { activityName } from "@/features/activity/activityName"
import { useSession } from "@/features/auth/hooks/useSession"
import { PublicProfilePage } from "@/features/profile/components/PublicProfilePage"

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
    />
  )
}

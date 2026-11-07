import { useQuery } from "@tanstack/react-query"
import { Navigate } from "@tanstack/react-router"
import { HTTPError } from "ky"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { publicProfileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { PublicProfileView } from "@/features/profile/components/PublicProfileView"

/**
 * Profil uživatele (F-04.2): another person's profile, loaded by id. My own id
 * leads to Můj profil, the page with the edit button.
 */
export function PublicProfilePage({
  userId,
  ownUserId,
  activityLabel,
}: {
  userId: string
  /** The signed-in person; their own id leads to Můj profil. */
  ownUserId?: string
  /** Display name of an activity; the activity feature owns the translation. */
  activityLabel: (activity: { name: string; icon: string }) => string
}) {
  const { t } = useTranslation()
  const isOwn = ownUserId === userId
  const profile = useQuery({ ...publicProfileQueryOptions(userId), enabled: !isOwn })
  const isNotFound = profile.error instanceof HTTPError && profile.error.response.status === 404

  // My own profile is the page with the edit button, not this one.
  if (isOwn) {
    return (
      <Navigate
        to={ROUTES.profile}
        replace
      />
    )
  }

  return (
    <>
      <Seo title={profile.data?.name ?? t("profile.userProfile.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-12">
        {profile.isPending ? (
          <div className="flex justify-center py-8">
            <Loader
              variant="player"
              label={t("profile.loading")}
            />
          </div>
        ) : isNotFound ? (
          <Alert>
            <AlertDescription>{t("profile.userProfile.notFound")}</AlertDescription>
          </Alert>
        ) : profile.isError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{t("profile.loadError")}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="max-md:h-11"
                onClick={() => void profile.refetch()}
              >
                <RefreshCw className="size-4" />
                {t("onboarding.reload")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <PublicProfileView
            profile={profile.data}
            activityLabel={activityLabel}
          />
        )}
      </section>
    </>
  )
}

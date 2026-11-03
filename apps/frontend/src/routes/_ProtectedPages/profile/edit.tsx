import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import { levelsQueryOptions } from "@/features/level/api/levelsQueryOptions"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { EditProfileForm } from "@/features/profile/components/EditProfileForm"

export const Route = createFileRoute("/_ProtectedPages/profile/edit")({
  component: EditProfilePage,
})

function EditProfilePage() {
  const { t } = useTranslation()
  const profile = useQuery(profileQueryOptions())
  const activities = useQuery(activitiesQueryOptions())
  // A level is optional: if the list cannot be loaded the form still works.
  const levels = useQuery(levelsQueryOptions())
  // A stable function, so the picker's list of options is not rebuilt on every render.
  const activityLabel = useCallback(
    (activity: { name: string; icon: string }) => activityName(t, activity),
    [t],
  )

  return (
    <>
      <Seo title={t("profile.edit.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t("profile.edit.title")}</h1>

        {profile.isPending || activities.isPending ? (
          <div className="flex justify-center py-8">
            <Loader
              variant="player"
              label={t("profile.loading")}
            />
          </div>
        ) : profile.isError || activities.isError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{t("profile.loadError")}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="max-md:h-11"
                onClick={() => {
                  void profile.refetch()
                  void activities.refetch()
                }}
              >
                <RefreshCw className="size-4" />
                {t("onboarding.reload")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <EditProfileForm
            profile={profile.data}
            activities={activities.data}
            activityLabel={activityLabel}
            levels={levels.data ?? []}
          />
        )}
      </section>
    </>
  )
}

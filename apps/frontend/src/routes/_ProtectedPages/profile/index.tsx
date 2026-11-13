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
import { ChangePassword } from "@/features/auth/components/ChangePassword"
import { VerifyEmailPrompt } from "@/features/auth/components/VerifyEmailPrompt"
import { ProfilePrompt } from "@/features/onboarding/components/ProfilePrompt"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { ProfileView } from "@/features/profile/components/ProfileView"

export const Route = createFileRoute("/_ProtectedPages/profile/")({
  component: ProfilePage,
})

function ProfilePage() {
  const { t } = useTranslation()
  const profile = useQuery(profileQueryOptions())
  // A stable function, so the list is not rebuilt on every render.
  const activityLabel = useCallback(
    (activity: { name: string; icon: string }) => activityName(t, activity),
    [t],
  )

  return (
    <>
      <Seo title={t("profile.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-12">
        <VerifyEmailPrompt />
        <div className="empty:hidden">
          <ProfilePrompt />
        </div>

        {profile.isPending ? (
          <div className="flex justify-center py-8">
            <Loader
              variant="player"
              label={t("profile.loading")}
            />
          </div>
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
          <>
            <ProfileView
              profile={profile.data}
              activityLabel={activityLabel}
            />
            <ChangePassword />
          </>
        )}
      </section>
    </>
  )
}

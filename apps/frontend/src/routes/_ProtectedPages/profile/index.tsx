import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useMediaQuery, WIDE_QUERY } from "@/hooks/useMediaQuery"

import { activityName } from "@/features/activity/activityName"
import { AppSettingsSection } from "@/features/auth/components/AppSettingsSection"
import { ChangePassword } from "@/features/auth/components/ChangePassword"
import { VerifyEmailPrompt } from "@/features/auth/components/VerifyEmailPrompt"
import { useSession } from "@/features/auth/hooks/useSession"
import { MyUpcomingEvents } from "@/features/event/components/MyUpcomingEvents"
import { ProfilePrompt } from "@/features/onboarding/components/ProfilePrompt"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
import { ProfileView } from "@/features/profile/components/ProfileView"

export const Route = createFileRoute("/_ProtectedPages/profile/")({
  component: ProfilePage,
})

function ProfilePage() {
  const { t } = useTranslation()
  const profile = useQuery(profileQueryOptions())
  const { user } = useSession()
  // The side panel and its requests only where there is room for it (#224).
  const isWide = useMediaQuery(WIDE_QUERY)
  // A stable function, so the list is not rebuilt on every render.
  const activityLabel = useCallback(
    (activity: { name: string; icon: string }) => activityName(t, activity),
    [t],
  )

  return (
    <>
      <Seo title={t("profile.title")} />
      {/* On a large screen the person's own upcoming events sit beside the
          profile (#224). Only here: nobody else sees them (visibility matrix). */}
      <section className="mx-auto flex w-full max-w-column-2xl flex-col gap-6 px-page py-6 md:py-12 lg:max-w-column-5xl">
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
              aside={
                isWide && user ? (
                  <MyUpcomingEvents
                    userId={user.id}
                    className="lg:sticky lg:top-24"
                  />
                ) : null
              }
            >
              <ChangePassword />
              <AppSettingsSection />
            </ProfileView>
          </>
        )}
      </section>
    </>
  )
}

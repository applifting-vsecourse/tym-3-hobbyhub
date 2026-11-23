import type { ReactNode } from "react"
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
import type { PublicProfile } from "@/features/profile/api/profileSchemas"
import { PublicProfileView } from "@/features/profile/components/PublicProfileView"

/**
 * Profil uživatele (F-04.2): another person's profile, loaded by id. My own id
 * leads to Můj profil, the page with the edit button.
 */
export function PublicProfilePage({
  userId,
  ownUserId,
  activityLabel,
  renderFriendAction,
  renderEvents,
  reportAction,
  blockAction,
}: {
  userId: string
  /** The signed-in person; their own id leads to Můj profil. */
  ownUserId?: string
  /** Display name of an activity; the activity feature owns the translation. */
  activityLabel: (activity: { name: string; icon: string }) => string
  /**
   * #225: what I can do about friendship with the person; the friendship
   * feature owns it. `reload` fetches the profile again after a change.
   */
  renderFriendAction?: (props: {
    userId: string
    userName: string
    relation: PublicProfile["relation"]
    reload: () => Promise<unknown>
  }) => ReactNode
  /**
   * #226: a friend's events, from the first pages the profile brought; the
   * event feature owns them. `loadedAt` says how fresh they are.
   */
  renderEvents?: (profile: {
    id: string
    upcomingEvents: unknown
    pastEvents: unknown
    loadedAt: number
  }) => ReactNode
  /** "Nahlásit uživatele" (#240) for the loaded profile; the report feature owns it. */
  reportAction?: (profile: { id: string; name: string }) => ReactNode
  /** "Zablokovat" or "Odblokovat" (#65) for the loaded profile; the user-block feature owns it. */
  blockAction?: (profile: { id: string; name: string; isBlockedByMe: boolean }) => ReactNode
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
      <section className="mx-auto flex w-full max-w-column-2xl flex-col gap-6 px-page py-6 md:py-12">
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
          <>
            <PublicProfileView
              profile={profile.data}
              activityLabel={activityLabel}
              friendAction={renderFriendAction?.({
                userId: profile.data.id,
                userName: profile.data.name,
                relation: profile.data.relation,
                reload: () => profile.refetch(),
              })}
              events={renderEvents?.({
                id: profile.data.id,
                upcomingEvents: profile.data.upcomingEvents,
                pastEvents: profile.data.pastEvents,
                loadedAt: profile.dataUpdatedAt,
              })}
            />
            {reportAction || blockAction ? (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                {blockAction?.(profile.data)}
                {reportAction?.(profile.data)}
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  )
}

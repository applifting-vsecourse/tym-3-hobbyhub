import { useTranslation } from "react-i18next"

import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { ProfileCover } from "@/components/hobbyhub/ProfileCover"

import type { PublicProfile } from "@/features/profile/api/profileSchemas"
import { ActivityChip } from "@/features/profile/components/ActivityChip"
import { firstSportIcon } from "@/features/profile/lib/firstSport"

type PublicProfileViewProps = {
  profile: PublicProfile
  /** Display name of an activity; the activity feature owns the translation. */
  activityLabel: (activity: { name: string; icon: string }) => string
}

/**
 * Profil uživatele (F-04.2): what another signed-in person sees — the cover,
 * the photo, the nickname, the bio and what they play. Nothing else: the
 * visibility matrix has no more for a signed-in stranger.
 */
export function PublicProfileView({ profile, activityLabel }: PublicProfileViewProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col">
        <ProfileCover
          cover={profile.cover}
          firstActivityIcon={firstSportIcon(profile.interests.map(({ activity }) => activity))}
        />
        <div className="-mt-12 px-4 md:-mt-14 md:px-6">
          <PersonAvatar
            name={profile.name}
            photo={profile.image}
            size="2xl"
            className="ring-4 ring-background"
          />
        </div>
        <div className="mt-4 flex flex-col gap-2 px-1">
          <h1 className="typo-h1 text-balance break-words text-foreground">{profile.name}</h1>
          {profile.bio ? (
            <p className="mt-1 typo-body-lg break-words whitespace-pre-line text-foreground">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>

      {profile.interests.length > 0 ? (
        <section
          aria-labelledby="public-profile-activities"
          className="flex flex-col gap-3 border-t border-border pt-6"
        >
          <h2
            id="public-profile-activities"
            className="typo-h3 text-foreground"
          >
            {t("profile.userProfile.interests")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {profile.interests.map(({ activity, level }) => (
              <ActivityChip
                key={activity.id}
                icon={activity.icon}
                name={activityLabel(activity)}
                level={level?.name}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

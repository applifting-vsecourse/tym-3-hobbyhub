import { Link } from "@tanstack/react-router"
import { Cake, Lock, MapPin, Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { ProfileCover } from "@/components/hobbyhub/ProfileCover"
import { Button } from "@/components/ui/button"

import type { Profile } from "@/features/profile/api/profileSchemas"
import { ActivityChip } from "@/features/profile/components/ActivityChip"
import { firstSportIcon } from "@/features/profile/lib/firstSport"

type ProfileViewProps = {
  profile: Profile
  /** Display name of an activity; the activity feature owns the translation. */
  activityLabel: (activity: { name: string; icon: string }) => string
}

/**
 * Můj profil — the profile as others see it: a tinted cover with the photo on
 * its edge, the nickname, the bio and what I play. What only I see (the home
 * city and the year of birth) is set apart and marked as private. Editing is one tap away.
 */
export function ProfileView({ profile, activityLabel }: ProfileViewProps) {
  const { t, i18n } = useTranslation()
  const joined = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
    profile.joinedAt,
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col">
        <ProfileCover
          cover={profile.cover}
          firstActivityIcon={firstSportIcon(profile.interests.map(({ activity }) => activity))}
        />
        <div className="-mt-12 flex items-end justify-between gap-3 px-4 md:-mt-14 md:px-6">
          <PersonAvatar
            name={profile.name}
            photo={profile.image}
            size="2xl"
            className="ring-4 ring-background"
          />
          <Button
            asChild
            className="mb-1"
          >
            <Link to={ROUTES.profileEdit}>
              <Pencil aria-hidden="true" />
              {t("profile.view.edit")}
            </Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-2 px-1">
          <h1 className="typo-h1 text-balance text-foreground">{profile.name}</h1>
          <p className="typo-small text-muted-foreground">
            {t("profile.view.memberSince", { date: joined })}
          </p>
          {profile.bio ? (
            <p className="mt-1 typo-body-lg whitespace-pre-line text-foreground">{profile.bio}</p>
          ) : (
            <p className="mt-1 typo-body text-muted-foreground">
              {t("profile.view.noBio")}{" "}
              <Link
                to={ROUTES.profileEdit}
                className="underline underline-offset-4"
              >
                {t("profile.view.addBio")}
              </Link>
            </p>
          )}
        </div>
      </div>

      <section
        aria-labelledby="profile-activities"
        className="flex flex-col gap-3 border-t border-border pt-6"
      >
        <h2
          id="profile-activities"
          className="typo-h3 text-foreground"
        >
          {t("profile.interests.title")}
        </h2>
        {profile.interests.length > 0 ? (
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
        ) : (
          <p className="typo-body text-muted-foreground">
            {t("profile.view.noActivities")}{" "}
            <Link
              to={ROUTES.profileEdit}
              className="underline underline-offset-4"
            >
              {t("profile.view.addActivities")}
            </Link>
          </p>
        )}
      </section>

      <section
        aria-labelledby="profile-private"
        className="flex flex-col gap-3 border-t border-border pt-6"
      >
        <h2
          id="profile-private"
          className="flex items-center gap-2 typo-h3 text-foreground"
        >
          <Lock
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          {t("profile.view.privateTitle")}
        </h2>
        <p className="typo-small text-muted-foreground">{t("profile.view.privateHint")}</p>
        <p className="flex items-center gap-2 typo-body text-foreground">
          <MapPin
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          {profile.address ? profile.address.city : t("profile.view.noAddress")}
        </p>
        <p className="flex items-center gap-2 typo-body text-foreground">
          <Cake
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          {profile.birthYear === null
            ? t("profile.view.noBirthYear")
            : t("profile.view.birthYear", { year: profile.birthYear })}
        </p>
      </section>
    </div>
  )
}

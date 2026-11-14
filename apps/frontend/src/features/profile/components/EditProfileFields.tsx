import { useState } from "react"
import { Lock } from "lucide-react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  ActivityPicker,
  type ActivityOption,
  type LevelOption,
} from "@/components/hobbyhub/ActivityPicker"
import { AddressSearch } from "@/components/hobbyhub/AddressSearch"
import { ProfileCoverPicker } from "@/components/hobbyhub/ProfileCoverPicker"
import {
  ProfilePicturePicker,
  type ProfilePicture,
} from "@/components/hobbyhub/ProfilePicturePicker"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { hasAddressSuggestions, type AddressSuggestion } from "@/lib/addressSuggestions"
import { PhotoError, toWebpDataUrl, type PhotoProblem } from "@/lib/webpImage"

import { GENDERS } from "@/features/profile/api/profileSchemas"
import { ProfileSection } from "@/features/profile/components/ProfileSection"
import { RemoveLocation } from "@/features/profile/components/RemoveLocation"
import type { EditProfileValues } from "@/features/profile/lib/editProfile"
import { firstSportIcon } from "@/features/profile/lib/firstSport"
import { BIO_MAX_LENGTH } from "@/features/profile/lib/profileLimits"
import { imageOfAvatar, pictureOf } from "@/features/profile/lib/profilePicture"

const GENDER_LABELS = {
  MALE: "auth.gender.male",
  FEMALE: "auth.gender.female",
} as const

/**
 * Vzhled profilu — edited where it is seen: the cover with the picture over its
 * edge, as on the profile, then the nickname and the bio under them.
 */
export function PublicFields({ activities }: { activities: ActivityOption[] }) {
  const { t } = useTranslation()
  const form = useFormContext<EditProfileValues>()
  const selection = useWatch({ control: form.control, name: "selection" })
  // With no cover chosen, the first sport picked decides which one is shown.
  const firstIcon = firstSportIcon(
    activities.filter((activity) => selection.some((item) => item.activityId === activity.id)),
  )
  const [photoProblem, setPhotoProblem] = useState<PhotoProblem | null>(null)

  const choosePicture = async (picture: ProfilePicture | null) => {
    setPhotoProblem(null)
    const options = { shouldDirty: true }
    if (!picture) return form.setValue("image", null, options)
    if (picture.kind === "avatar") {
      return form.setValue("image", imageOfAvatar(picture.avatar), options)
    }
    try {
      form.setValue("image", await toWebpDataUrl(picture.url), options)
    } catch (error) {
      setPhotoProblem(error instanceof PhotoError ? error.problem : "unreadable")
    } finally {
      URL.revokeObjectURL(picture.url)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <FormField
          control={form.control}
          name="cover"
          render={({ field }) => (
            <ProfileCoverPicker
              isCompact
              value={field.value}
              firstActivityIcon={firstIcon}
              onChange={(cover) => form.setValue("cover", cover, { shouldDirty: true })}
            />
          )}
        />
        <div className="-mt-12 flex flex-col gap-2 px-4 md:-mt-14 md:px-6">
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <ProfilePicturePicker
                isCompact
                value={pictureOf(field.value)}
                onChange={(picture) => void choosePicture(picture)}
                className="self-start"
              />
            )}
          />
        </div>
        {photoProblem ? (
          <p
            role="alert"
            className="mt-2 typo-small text-destructive"
          >
            {t(`profile.public.photoProblem.${photoProblem}`)}
          </p>
        ) : null}
        <p className="mt-2 typo-small text-muted-foreground">{t("profile.public.mediaHint")}</p>
      </div>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("profile.public.name")}</FormLabel>
            <FormControl>
              <Input
                autoComplete="nickname"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("onboarding.profile.bio")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("onboarding.profile.bioPlaceholder")}
                {...field}
              />
            </FormControl>
            <p className="typo-small text-muted-foreground">
              {t("onboarding.profile.bioCount", {
                length: [...field.value].length,
                max: BIO_MAX_LENGTH,
              })}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

type InterestsFieldsProps = {
  activities: ActivityOption[]
  activityLabel: (activity: ActivityOption) => string
  levels: LevelOption[]
}

/** Co rád hraju — the activities and how well, the same picker as the onboarding. */
export function InterestsFields({ activities, activityLabel, levels }: InterestsFieldsProps) {
  const { t } = useTranslation()
  const form = useFormContext<EditProfileValues>()

  return (
    <ProfileSection
      title={t("profile.interests.title")}
      description={t("profile.interests.description")}
    >
      <FormField
        control={form.control}
        name="selection"
        render={({ field }) => (
          <FormItem className="gap-3">
            <ActivityPicker
              activities={activities}
              activityLabel={activityLabel}
              levels={levels}
              value={field.value}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </ProfileSection>
  )
}

/** Kde bydlím — the private home address, the same one the onboarding asks for. */
export function LocationFields({
  hasSavedAddress,
  onRemoved,
}: {
  hasSavedAddress: boolean
  onRemoved: () => void
}) {
  const { t } = useTranslation()
  const form = useFormContext<EditProfileValues>()

  return (
    <ProfileSection
      title={t("profile.location.title")}
      description={t("profile.location.description")}
    >
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("onboarding.location.address")}</FormLabel>
            {hasAddressSuggestions() ? (
              <>
                <FormControl>
                  <AddressSearch
                    isStreetAllowed
                    value={field.value?.label ?? ""}
                    placeholder={t("onboarding.location.addressPlaceholder")}
                    onSelect={(selected: AddressSuggestion) => field.onChange(selected)}
                  />
                </FormControl>
                <p className="typo-small text-muted-foreground">{t("profile.location.howTo")}</p>
              </>
            ) : (
              <p className="typo-small text-muted-foreground">
                {t("onboarding.location.addressUnavailable")}
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <p className="flex items-start gap-2 typo-small text-muted-foreground">
        <Lock
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        />
        {t("profile.location.notice")}
      </p>
      {hasSavedAddress ? <RemoveLocation onRemoved={onRemoved} /> : null}
    </ProfileSection>
  )
}

/** Soukromé údaje — gender and year of birth from the sign-up, never shown to anyone else. */
export function PrivateFields() {
  const { t } = useTranslation()
  const form = useFormContext<EditProfileValues>()

  return (
    <ProfileSection
      title={t("profile.private.title")}
      description={t("profile.private.description")}
    >
      <p className="flex items-center gap-2 typo-small text-muted-foreground">
        <Lock
          aria-hidden="true"
          className="size-4"
        />
        {t("profile.private.notice")}
      </p>

      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.fields.gender")}</FormLabel>
            <Select
              name={field.name}
              value={field.value ?? ""}
              onValueChange={field.onChange}
            >
              <FormControl>
                <SelectTrigger
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className="w-full"
                >
                  <SelectValue placeholder={t("auth.placeholders.gender")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {GENDERS.map((gender) => (
                  <SelectItem
                    key={gender}
                    value={gender}
                  >
                    {t(GENDER_LABELS[gender])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="birthYear"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.fields.birthYear")}</FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                autoComplete="bday-year"
                maxLength={4}
                placeholder={t("auth.placeholders.birthYear")}
                {...field}
              />
            </FormControl>
            <FormDescription>{t("profile.private.birthYearHint")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </ProfileSection>
  )
}

const FRIEND_VISIBILITY_SWITCHES = [
  {
    name: "friendsSeeEventHistory",
    label: "profile.friendVisibility.history",
    hint: "profile.friendVisibility.historyHint",
  },
  {
    name: "friendsSeeUpcomingEvents",
    label: "profile.friendVisibility.upcoming",
    hint: "profile.friendVisibility.upcomingHint",
  },
] as const

/**
 * #227: what friends see of the events: the history (on by default) and the
 * upcoming events (off by default). Saved with the rest by "Uložit".
 */
export function FriendVisibilityFields() {
  const { t } = useTranslation()
  const form = useFormContext<EditProfileValues>()

  return (
    <ProfileSection
      title={t("profile.friendVisibility.title")}
      description={t("profile.friendVisibility.description")}
    >
      {FRIEND_VISIBILITY_SWITCHES.map((item) => (
        <FormField
          key={item.name}
          control={form.control}
          name={item.name}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <FormLabel>{t(item.label)}</FormLabel>
                <FormDescription>{t(item.hint)}</FormDescription>
              </div>
              <FormControl>
                <Switch
                  ref={field.ref}
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  className="mt-1"
                />
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </ProfileSection>
  )
}

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AppForm } from "@/components/form/AppForm"
import type { ActivityOption, LevelOption } from "@/components/hobbyhub/ActivityPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useNicknameAvailability } from "@/hooks/useNicknameAvailability"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"
import { NICKNAME_LIMITS } from "@/lib/nickname"

import {
  NICKNAME_REFUSAL_MESSAGES,
  nicknameRefusalOf,
} from "@/features/profile/api/nicknameRefusal"
import type { Profile } from "@/features/profile/api/profileSchemas"
import {
  FriendVisibilityFields,
  InterestsFields,
  LocationFields,
  PrivateFields,
  PublicFields,
} from "@/features/profile/components/EditProfileFields"
import {
  useUpdateInterests,
  useUpdateLocation,
  useUpdatePrivateDetails,
  useUpdateProfile,
} from "@/features/profile/hooks/useProfileMutations"
import {
  createEditProfileSchema,
  editValuesOf,
  type EditProfileValues,
} from "@/features/profile/lib/editProfile"
import { privateDetailsErrorsOf } from "@/features/profile/lib/privateDetailsErrors"

type EditProfileFormProps = {
  profile: Profile
  activities: ActivityOption[]
  activityLabel: (activity: ActivityOption) => string
  levels: LevelOption[]
}

const differs = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b)

/**
 * Upravit profil — one form for everything, one Uložit. The server keeps the
 * public details, the activities, the address and the private details apart,
 * so only the parts that changed are sent.
 */
export function EditProfileForm({
  profile,
  activities,
  activityLabel,
  levels,
}: EditProfileFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(() => editValuesOf(profile))
  const schema = useMemo(() => createEditProfileSchema(t, saved.name), [t, saved.name])
  const form = useForm<EditProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: saved,
  })
  // A refused private detail has its own message: it held back the switches too.
  const [saveError, setSaveError] = useState<"failed" | "privateRefused" | null>(null)
  const updateProfile = useUpdateProfile()
  const updateInterests = useUpdateInterests()
  const updateLocation = useUpdateLocation()
  const updatePrivate = useUpdatePrivateDetails()

  useRevalidateOnLanguageChange(form)
  const nickname = useWatch({ control: form.control, name: "name" })
  const nicknameAvailability = useNicknameAvailability(nickname, saved.name)

  // A refused nickname or private detail is explained at its field, anything
  // else as a failed save.
  const explainFailure = (error: unknown) => {
    const refusal = nicknameRefusalOf(error)
    if (refusal) {
      form.setError("name", { message: t(NICKNAME_REFUSAL_MESSAGES[refusal], NICKNAME_LIMITS) })
      return
    }
    // The server refused a private detail: say which, at its field.
    const refused = privateDetailsErrorsOf(error)
    for (const { field, message } of refused) {
      form.setError(field, { message: t(message) })
    }
    setSaveError(refused.length > 0 ? "privateRefused" : "failed")
  }

  const submit = async (values: EditProfileValues) => {
    setSaveError(null)
    // #212: the hint under the field already says so; the server would refuse it.
    if (nicknameAvailability === "taken") {
      form.setFocus("name")
      return
    }
    // The activities are the one part the server insists on: it needs one.
    if (differs(values.selection, saved.selection) && values.selection.length === 0) {
      form.setError("selection", { message: t("profile.interests.none") })
      return
    }
    // What the server has so far: a part that went through is not sent again if a
    // later one fails and the form is submitted a second time.
    let done = saved
    try {
      // Only what changed, so a new name does not carry the picture along again.
      const changes = {
        ...(values.name !== done.name && { name: values.name }),
        ...(values.bio !== done.bio && { bio: values.bio || null }),
        ...(values.image !== done.image && { image: values.image }),
        ...(values.cover !== done.cover && { cover: values.cover }),
      }
      if (Object.keys(changes).length > 0) {
        await updateProfile.mutateAsync(changes)
        done = {
          ...done,
          name: values.name,
          bio: values.bio,
          image: values.image,
          cover: values.cover,
        }
      }
      if (differs(values.selection, done.selection)) {
        await updateInterests.mutateAsync({ items: values.selection })
        done = { ...done, selection: values.selection }
      }
      if (values.address && differs(values.address, done.address)) {
        const { street, city, postalCode, country, latitude, longitude } = values.address
        await updateLocation.mutateAsync({ street, city, postalCode, country, latitude, longitude })
        done = { ...done, address: values.address }
      }
      // The private details and what friends see (#227) go in one request,
      // which the server saves in one write: never one without the other.
      const hasDetailsChange = values.gender !== done.gender || values.birthYear !== done.birthYear
      const hasVisibilityChange =
        values.friendsSeeEventHistory !== done.friendsSeeEventHistory ||
        values.friendsSeeUpcomingEvents !== done.friendsSeeUpcomingEvents
      if ((hasDetailsChange && values.gender && values.birthYear) || hasVisibilityChange) {
        await updatePrivate.mutateAsync({
          ...(hasDetailsChange &&
            values.gender &&
            values.birthYear && {
              gender: values.gender,
              birthYear: Number(values.birthYear.trim()),
            }),
          ...(hasVisibilityChange && {
            friendsSeeEventHistory: values.friendsSeeEventHistory,
            friendsSeeUpcomingEvents: values.friendsSeeUpcomingEvents,
          }),
        })
      }
    } catch (error) {
      setSaved(done)
      explainFailure(error)
      throw error
    }
    setSaved(values)
    form.reset(values)
    await navigate({ to: ROUTES.profile })
  }

  const isSaving =
    updateProfile.isPending ||
    updateInterests.isPending ||
    updateLocation.isPending ||
    updatePrivate.isPending

  return (
    <AppForm
      form={form}
      onSubmit={submit}
      className="flex flex-col gap-8"
    >
      <PublicFields
        activities={activities}
        nicknameChangeableFrom={profile.nicknameChangeableFrom}
        nicknameAvailability={nicknameAvailability}
      />
      <InterestsFields
        activities={activities}
        activityLabel={activityLabel}
        levels={levels}
      />
      <LocationFields
        hasSavedAddress={saved.address !== null}
        onRemoved={() => {
          setSaved((current) => ({ ...current, address: null }))
          form.resetField("address", { defaultValue: null })
        }}
      />
      <PrivateFields />
      <FriendVisibilityFields />

      {saveError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {t(saveError === "privateRefused" ? "profile.privateRefused" : "profile.saveError")}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row-reverse sm:justify-start">
        <Button
          type="submit"
          className="max-md:h-11"
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("profile.save")}
        </Button>
        <Button
          asChild
          variant="ghost"
          className="max-md:h-11"
        >
          <Link to={ROUTES.profile}>{t("profile.cancel")}</Link>
        </Button>
      </div>
    </AppForm>
  )
}

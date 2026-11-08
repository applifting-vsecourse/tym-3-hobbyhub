import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AppForm } from "@/components/form/AppForm"
import type { ActivityOption, LevelOption } from "@/components/hobbyhub/ActivityPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

import type { Profile } from "@/features/profile/api/profileSchemas"
import {
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
  const schema = useMemo(() => createEditProfileSchema(t), [t])
  const [saved, setSaved] = useState(() => editValuesOf(profile))
  const form = useForm<EditProfileValues>({
    resolver: zodResolver(schema),
    defaultValues: saved,
  })
  const [hasSaveError, setHasSaveError] = useState(false)
  const updateProfile = useUpdateProfile()
  const updateInterests = useUpdateInterests()
  const updateLocation = useUpdateLocation()
  const updatePrivate = useUpdatePrivateDetails()

  useRevalidateOnLanguageChange(form)

  const submit = async (values: EditProfileValues) => {
    setHasSaveError(false)
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
      if (
        values.gender &&
        values.birthYear &&
        (values.gender !== done.gender || values.birthYear !== done.birthYear)
      ) {
        await updatePrivate.mutateAsync({
          gender: values.gender,
          birthYear: Number(values.birthYear.trim()),
        })
        done = { ...done, gender: values.gender, birthYear: values.birthYear }
      }
    } catch (error) {
      setSaved(done)
      setHasSaveError(true)
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
      <PublicFields activities={activities} />
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

      {hasSaveError ? (
        <Alert variant="destructive">
          <AlertDescription>{t("profile.saveError")}</AlertDescription>
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

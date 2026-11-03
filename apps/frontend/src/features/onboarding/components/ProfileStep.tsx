import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { avatarPicture, illustrationOf } from "@/components/hobbyhub/PersonAvatar"
import {
  ProfilePicturePicker,
  type ProfilePicture,
} from "@/components/hobbyhub/ProfilePicturePicker"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"
import { PhotoError, toWebpDataUrl, type PhotoProblem } from "@/lib/webpImage"

import type { Onboarding, SaveProfileInput } from "@/features/onboarding/api/onboardingSchemas"
import {
  OnboardingStepLayout,
  SaveError,
  StepActions,
} from "@/features/onboarding/components/OnboardingStepLayout"
import { BIO_MAX_LENGTH } from "@/features/onboarding/lib/onboardingLimits"

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    // Counted in characters, as the server does, not UTF-16 units.
    bio: z
      .string()
      .trim()
      .refine(
        (value) => [...value].length <= BIO_MAX_LENGTH,
        t("onboarding.profile.bioTooLong", { max: BIO_MAX_LENGTH }),
      ),
  })

type ProfileFormValues = z.infer<ReturnType<typeof createSchema>>

/** What the picker shows for the stored picture: an illustration or the photo. */
const pictureOfImage = (image: string | null): ProfilePicture | null => {
  if (!image) return null
  const avatar = illustrationOf(image)
  return avatar ? { kind: "avatar", avatar } : { kind: "photo", url: image }
}

/** The stored form of the chosen picture: an illustration's name or a shrunk WebP photo. */
const pictureToImage = async (picture: ProfilePicture | null): Promise<string | null> => {
  if (!picture) return null
  if (picture.kind === "avatar") return avatarPicture(picture.avatar)
  // A photo saved before is already WebP text; a new one is an object URL.
  return picture.url.startsWith("data:") ? picture.url : toWebpDataUrl(picture.url)
}

type ProfileStepProps = {
  initial: Pick<Onboarding, "bio" | "image">
  isLast: boolean
  isReturningToEvent: boolean
  isSaving: boolean
  hasSaveError: boolean
  onSubmit: (input: SaveProfileInput) => Promise<void>
  onSkip: () => void
  onSkipAll: () => void
  onBack?: () => void
  shouldFocusHeading?: boolean
}

export function ProfileStep({
  initial,
  isLast,
  isReturningToEvent,
  isSaving,
  hasSaveError,
  onSubmit,
  onSkip,
  onSkipAll,
  onBack,
  shouldFocusHeading,
}: ProfileStepProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bio: initial.bio ?? "" },
  })
  const bio = useWatch({ control: form.control, name: "bio" })
  // The picture saved before, or none; a change is sent, an untouched one is not.
  const [picture, setPicture] = useState<ProfilePicture | null>(() => pictureOfImage(initial.image))
  const [isPictureChanged, setIsPictureChanged] = useState(false)
  const [photoProblem, setPhotoProblem] = useState<PhotoProblem | null>(null)
  // An emptied bio that was saved before is a change to save, not a skip.
  const isEmpty = bio.trim() === "" && !initial.bio && !picture

  useRevalidateOnLanguageChange(form)

  // Whatever was half-done is dropped, so leaving does not ask about it.
  const leaveWith = (action: () => void) => () => {
    form.reset()
    action()
  }

  const submit = async ({ bio }: ProfileFormValues) => {
    setPhotoProblem(null)
    let image: string | null | undefined
    if (isPictureChanged) {
      try {
        image = await pictureToImage(picture)
      } catch (error) {
        setPhotoProblem(error instanceof PhotoError ? error.problem : "unreadable")
        return
      }
    }
    await onSubmit({ bio: bio || undefined, image })
  }

  return (
    <OnboardingStepLayout
      screen={3}
      title={t("onboarding.profile.title")}
      description={t("onboarding.profile.description")}
      onSkipAll={leaveWith(onSkipAll)}
      isBusy={isSaving}
      shouldFocusHeading={shouldFocusHeading}
    >
      <AppForm
        form={form}
        onSubmit={submit}
        className="flex flex-col gap-6"
      >
        <SaveError isVisible={hasSaveError} />

        <ProfilePicturePicker
          value={picture}
          onChange={(next) => {
            setPicture(next)
            setIsPictureChanged(true)
          }}
          label={t("onboarding.profile.pictureLabel")}
          hint={t("onboarding.profile.pictureHint")}
        />
        {photoProblem ? (
          <p
            role="alert"
            className="typo-small text-destructive"
          >
            {t(`profile.public.photoProblem.${photoProblem}`)}
          </p>
        ) : null}

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

        <StepActions
          isSaving={isSaving}
          isEmpty={isEmpty}
          isLast={isLast}
          isReturningToEvent={isReturningToEvent}
          onSkip={leaveWith(onSkip)}
          onBack={onBack}
        />
      </AppForm>
    </OnboardingStepLayout>
  )
}

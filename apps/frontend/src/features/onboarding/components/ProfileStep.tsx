import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import {
  ProfilePicturePicker,
  type ProfilePicture,
} from "@/components/hobbyhub/ProfilePicturePicker"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

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

type ProfileStepProps = {
  initial: Pick<Onboarding, "bio">
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
  // An emptied bio that was saved before is a change to save, not a skip.
  const isEmpty = bio.trim() === "" && !initial.bio

  useRevalidateOnLanguageChange(form)

  // Only held for now: the project has no image storage yet (F-04.1 #18), so
  // the choice is not sent.
  const [picture, setPicture] = useState<ProfilePicture | null>(null)

  const submit = async ({ bio }: ProfileFormValues) => onSubmit({ bio: bio || undefined })

  return (
    <OnboardingStepLayout
      screen={3}
      title={t("onboarding.profile.title")}
      description={t("onboarding.profile.description")}
      onSkipAll={onSkipAll}
      isBusy={isSaving}
      shouldFocusHeading={shouldFocusHeading}
    >
      <AppForm
        form={form}
        onSubmit={submit}
        isGuarded={false}
        className="flex flex-col gap-6"
      >
        <SaveError isVisible={hasSaveError} />

        <ProfilePicturePicker
          value={picture}
          onChange={setPicture}
          label={t("onboarding.profile.pictureLabel")}
          hint={t("onboarding.profile.pictureHint")}
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

        <StepActions
          isSaving={isSaving}
          isEmpty={isEmpty}
          isLast={isLast}
          isReturningToEvent={isReturningToEvent}
          onSkip={onSkip}
          onBack={onBack}
        />
      </AppForm>
    </OnboardingStepLayout>
  )
}

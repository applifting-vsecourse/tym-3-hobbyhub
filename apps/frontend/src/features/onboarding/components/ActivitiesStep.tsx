import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { RefreshCw } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

import type {
  ActivityOption,
  LevelOption,
  Onboarding,
  SaveActivitiesInput,
} from "@/features/onboarding/api/onboardingSchemas"
import { ActivityPicker } from "@/features/onboarding/components/ActivityPicker"
import {
  OnboardingStepLayout,
  SaveError,
  StepActions,
} from "@/features/onboarding/components/OnboardingStepLayout"

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    selection: z
      .array(z.object({ activityId: z.string(), levelId: z.string().nullable() }))
      .min(1, t("onboarding.activities.validation.none")),
  })

type ActivitiesFormValues = z.infer<ReturnType<typeof createSchema>>

type ActivitiesStepProps = {
  activities: ActivityOption[]
  /** Display name of an activity; the activity feature owns the translation. */
  activityLabel: (activity: ActivityOption) => string
  levels: LevelOption[]
  isLoadingActivities: boolean
  activitiesError: Error | null
  onReloadActivities: () => void
  initial: Onboarding["interests"]
  isLast: boolean
  isReturningToEvent: boolean
  isSaving: boolean
  hasSaveError: boolean
  onSubmit: (input: SaveActivitiesInput) => Promise<void>
  onSkip: () => void
  onSkipAll: () => void
  onBack?: () => void
  shouldFocusHeading?: boolean
}

export function ActivitiesStep({
  activities,
  activityLabel,
  levels,
  isLoadingActivities,
  activitiesError,
  onReloadActivities,
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
}: ActivitiesStepProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<ActivitiesFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      selection: initial.map((interest) => ({
        activityId: interest.activity.id,
        levelId: interest.level?.id ?? null,
      })),
    },
  })
  const selection = useWatch({ control: form.control, name: "selection" })
  const isEmpty = selection.length === 0 && initial.length === 0

  useRevalidateOnLanguageChange(form)

  // Whatever was half-done is dropped, so leaving does not ask about it.
  const leaveWith = (action: () => void) => () => {
    form.reset()
    action()
  }

  const submit = async ({ selection }: ActivitiesFormValues) =>
    onSubmit({
      items: selection.map((item) => ({
        activityId: item.activityId,
        levelId: item.levelId,
      })),
    })

  return (
    <OnboardingStepLayout
      screen={1}
      title={t("onboarding.activities.title")}
      description={t("onboarding.activities.description")}
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

        {isLoadingActivities ? (
          <div className="flex justify-center py-8">
            <Loader
              variant="player"
              label={t("onboarding.activities.loading")}
            />
          </div>
        ) : activitiesError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{t("onboarding.activities.loadError")}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="max-md:h-11"
                onClick={onReloadActivities}
              >
                <RefreshCw className="size-4" />
                {t("onboarding.reload")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : activities.length === 0 ? (
          <p className="typo-body text-muted-foreground">{t("onboarding.activities.empty")}</p>
        ) : (
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
        )}

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

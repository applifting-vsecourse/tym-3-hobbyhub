import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { onboardingQueryOptions } from "@/features/onboarding/api/onboardingQueryOptions"
import type { ActivityOption, LevelOption } from "@/features/onboarding/api/onboardingSchemas"
import { ActivitiesStep } from "@/features/onboarding/components/ActivitiesStep"
import { LocationStep } from "@/features/onboarding/components/LocationStep"
import { ProfileStep } from "@/features/onboarding/components/ProfileStep"
import {
  useFinishOnboarding,
  useSaveActivities,
  useSaveLocation,
  useSaveProfile,
  useSkipOnboarding,
  useSkipStep,
} from "@/features/onboarding/hooks/useOnboardingMutations"
import { ONBOARDING_STEPS, SCREEN_COUNT } from "@/features/onboarding/lib/onboardingLimits"

type OnboardingWizardProps = {
  activities: ActivityOption[]
  isLoadingActivities: boolean
  activitiesError: Error | null
  onReloadActivities: () => void
  /** Display name of an activity; the activity feature owns the translation. */
  activityLabel: (activity: ActivityOption) => string
  /** The levels a person can name for an activity, from the catalogue. */
  levels: LevelOption[]
  /** The wizard was opened from a page to return to, e.g. an event. */
  isReturningToEvent: boolean
  /** Leaves the wizard, finished or skipped: to the page `from` or the list. */
  onLeave: () => void | Promise<void>
}

/**
 * The F-04.8 wizard: activities with a level, location and range, photo and
 * bio. Each step is saved when confirmed, so a closed tab resumes at the first
 * open step; any step or the whole wizard can be skipped.
 */
export function OnboardingWizard({
  activities,
  isLoadingActivities,
  activitiesError,
  onReloadActivities,
  activityLabel,
  levels,
  isReturningToEvent,
  onLeave,
}: OnboardingWizardProps) {
  const { t } = useTranslation()
  const onboardingQuery = useQuery(onboardingQueryOptions())

  const saveActivities = useSaveActivities()
  const saveLocation = useSaveLocation()
  const saveProfile = useSaveProfile()
  const skipStep = useSkipStep()
  const finish = useFinishOnboarding()
  const skipAll = useSkipOnboarding()

  const [screenOverride, setScreenOverride] = useState<number | null>(null)
  const [hasSaveError, setHasSaveError] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  // After the first move between screens focus follows the heading.
  const [hasMoved, setHasMoved] = useState(false)

  const onboarding = onboardingQuery.data

  if (onboardingQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader
          variant="player"
          label={t("onboarding.loading")}
        />
      </div>
    )
  }

  if (!onboarding) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{t("onboarding.loadError")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={() => void onboardingQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            {t("onboarding.reload")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // The first step still open; with all of them done, the last one to finish.
  const screen = screenOverride ?? Math.min(onboarding.stepsDone + 1, SCREEN_COUNT)
  const isLast = screen === SCREEN_COUNT

  const goTo = (target: number) => {
    setScreenOverride(target)
    setHasMoved(true)
    setHasSaveError(false)
  }
  // Past the last step the wizard ends.
  const afterStep = () => (isLast ? onLeave() : goTo(screen + 1))

  // A failed save keeps the user on the step with the error; it never throws
  // into the form.
  const run = async (work: () => Promise<unknown>, onDone: () => void | Promise<void>) => {
    setIsWorking(true)
    setHasSaveError(false)
    try {
      await work()
      await onDone()
    } catch {
      setHasSaveError(true)
    } finally {
      setIsWorking(false)
    }
  }

  const skipAllSteps = () => run(() => skipAll.mutateAsync(), onLeave)
  // Saving or skipping the last step also finishes the wizard.
  const finishIfLast = async () => {
    if (isLast) await finish.mutateAsync()
  }
  const skipThisStep = () =>
    run(async () => {
      await skipStep.mutateAsync(ONBOARDING_STEPS[screen - 1]!)
      await finishIfLast()
    }, afterStep)

  const stepProps = {
    isLast,
    isReturningToEvent,
    isSaving: isWorking,
    hasSaveError,
    onSkip: () => void skipThisStep(),
    onSkipAll: () => void skipAllSteps(),
    onBack: screen > 1 ? () => goTo(screen - 1) : undefined,
    shouldFocusHeading: hasMoved,
  }

  if (screen === 1) {
    return (
      <ActivitiesStep
        {...stepProps}
        activities={activities}
        activityLabel={activityLabel}
        levels={levels}
        isLoadingActivities={isLoadingActivities}
        activitiesError={activitiesError}
        onReloadActivities={onReloadActivities}
        initial={onboarding.interests}
        onSubmit={(input) => run(() => saveActivities.mutateAsync(input), afterStep)}
      />
    )
  }
  if (screen === 2) {
    return (
      <LocationStep
        {...stepProps}
        initial={onboarding}
        onSubmit={(input) => run(() => saveLocation.mutateAsync(input), afterStep)}
      />
    )
  }
  return (
    <ProfileStep
      {...stepProps}
      initial={onboarding}
      onSubmit={(input) =>
        run(async () => {
          await saveProfile.mutateAsync(input)
          await finishIfLast()
        }, afterStep)
      }
    />
  )
}

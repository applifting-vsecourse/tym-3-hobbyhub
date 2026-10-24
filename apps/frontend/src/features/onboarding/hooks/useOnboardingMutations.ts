import { useMutation, useQueryClient } from "@tanstack/react-query"

import { onboardingKeys } from "@/features/onboarding/api/onboardingKeys"
import {
  finishOnboarding,
  saveActivities,
  saveLocation,
  saveProfile,
  skipOnboarding,
  skipStep,
} from "@/features/onboarding/api/onboardingRequests"

// Every request answers with the new state: it replaces what the cache holds,
// so the wizard and the profile prompt read the same progress.
function useOnboardingMutation<TInput>(mutationFn: (input: TInput) => ReturnType<typeof skipStep>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (onboarding) => {
      queryClient.setQueryData(onboardingKeys.state(), onboarding)
    },
  })
}

export const useSaveActivities = () => useOnboardingMutation(saveActivities)
export const useSaveLocation = () => useOnboardingMutation(saveLocation)
export const useSaveProfile = () => useOnboardingMutation(saveProfile)
export const useSkipStep = () => useOnboardingMutation(skipStep)
export const useFinishOnboarding = () => useOnboardingMutation<void>(finishOnboarding)
export const useSkipOnboarding = () => useOnboardingMutation<void>(skipOnboarding)

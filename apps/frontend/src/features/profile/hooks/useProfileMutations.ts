import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"
import { onboardingKeys } from "@/lib/onboarding-keys"

import { profileKeys } from "@/features/profile/api/profileKeys"
import {
  removeLocation,
  updateInterests,
  updateLocation,
  updatePrivateDetails,
  updateProfile,
} from "@/features/profile/api/profileRequests"
import type { Profile } from "@/features/profile/api/profileSchemas"

// Every request answers with the whole profile: it replaces what the cache
// holds. The onboarding state is read from elsewhere and is asked again, and so
// is the session when the request can change what it carries (the nickname).
function useProfileMutation<TInput>(
  mutationFn: (input: TInput) => Promise<Profile>,
  { isSessionAffected = false } = {},
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.me(), profile)
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.all() })
      if (isSessionAffected) void queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}

export const useUpdateProfile = () => useProfileMutation(updateProfile, { isSessionAffected: true })
export const useUpdatePrivateDetails = () => useProfileMutation(updatePrivateDetails)
export const useUpdateInterests = () => useProfileMutation(updateInterests)
export const useUpdateLocation = () => useProfileMutation(updateLocation)
export const useRemoveLocation = () => useProfileMutation<void>(removeLocation)

import { queryOptions } from "@tanstack/react-query"

import { onboardingKeys } from "@/lib/onboarding-keys"

import { getOnboarding } from "@/features/onboarding/api/onboardingRequests"

export const onboardingQueryOptions = () =>
  queryOptions({
    queryKey: onboardingKeys.state(),
    queryFn: getOnboarding,
  })

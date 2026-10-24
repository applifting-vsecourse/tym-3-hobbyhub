import { queryOptions } from "@tanstack/react-query"

import { onboardingKeys } from "@/features/onboarding/api/onboardingKeys"
import { getOnboarding } from "@/features/onboarding/api/onboardingRequests"

export const onboardingQueryOptions = () =>
  queryOptions({
    queryKey: onboardingKeys.state(),
    queryFn: getOnboarding,
  })

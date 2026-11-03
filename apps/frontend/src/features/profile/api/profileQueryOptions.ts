import { queryOptions } from "@tanstack/react-query"

import { profileKeys } from "@/features/profile/api/profileKeys"
import { getProfile } from "@/features/profile/api/profileRequests"

export const profileQueryOptions = () =>
  queryOptions({
    queryKey: profileKeys.me(),
    queryFn: getProfile,
  })

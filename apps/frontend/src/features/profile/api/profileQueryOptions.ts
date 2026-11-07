import { queryOptions } from "@tanstack/react-query"

import { profileKeys } from "@/features/profile/api/profileKeys"
import { getProfile, getPublicProfile } from "@/features/profile/api/profileRequests"

export const profileQueryOptions = () =>
  queryOptions({
    queryKey: profileKeys.me(),
    queryFn: getProfile,
  })

export const publicProfileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: profileKeys.user(userId),
    queryFn: () => getPublicProfile(userId),
  })

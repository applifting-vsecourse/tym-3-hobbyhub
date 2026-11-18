import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import { groupKeys, type DiscoverGroupsFilters } from "@/features/group/api/groupKeys"
import {
  groupPageSchema,
  myGroupSchema,
  nearbyGroupsSchema,
} from "@/features/group/api/groupSchemas"

export const myGroupsQueryOptions = () =>
  queryOptions({
    queryKey: groupKeys.mine(),
    queryFn: async () => z.array(myGroupSchema).parse(await api.get("groups/mine").json()),
  })

export const nearbyGroupsQueryOptions = () =>
  queryOptions({
    queryKey: groupKeys.nearby(),
    queryFn: async () => nearbyGroupsSchema.parse(await api.get("groups/nearby").json()),
  })

export const discoverGroupsQueryOptions = (
  viewerId: string | null,
  filters: DiscoverGroupsFilters,
) =>
  infiniteQueryOptions({
    queryKey: groupKeys.discover(viewerId, filters),
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams()
      if (pageParam) searchParams.set("cursor", pageParam)
      for (const id of filters.activityIds) searchParams.append("activityIds", id)
      if (filters.search) searchParams.set("search", filters.search)
      if (filters.location) searchParams.set("location", filters.location)
      for (const day of filters.weekdays ?? []) searchParams.append("weekdays", String(day))
      if (filters.approvalMode) searchParams.set("approvalMode", filters.approvalMode)
      if (filters.onlyWithUpcomingEvent) searchParams.set("onlyWithUpcomingEvent", "true")
      if (filters.near) {
        searchParams.set("lat", String(filters.near.latitude))
        searchParams.set("lng", String(filters.near.longitude))
        searchParams.set("radiusKm", String(filters.near.radiusKm))
      }
      if (filters.sort) searchParams.set("sort", filters.sort)
      return groupPageSchema.parse(await api.get("groups/discover", { searchParams }).json())
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api-client"

import { groupKeys } from "@/features/group/api/groupKeys"
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

export const discoverGroupsQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: groupKeys.discover(),
    queryFn: async ({ pageParam }) =>
      groupPageSchema.parse(
        await api
          .get("groups/discover", { searchParams: pageParam ? { cursor: pageParam } : {} })
          .json(),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

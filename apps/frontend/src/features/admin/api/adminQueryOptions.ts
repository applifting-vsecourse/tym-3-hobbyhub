import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { adminKeys } from "@/features/admin/api/adminKeys"
import {
  adminEventDetailSchema,
  adminEventPageSchema,
  adminGroupDetailSchema,
  adminGroupPageSchema,
  adminGroupRequestSchema,
  administratorSchema,
  adminUserDetailSchema,
  adminUserEventsSchema,
  adminUserPageSchema,
} from "@/features/admin/api/adminSchemas"
import { adminApi } from "@/features/admin/lib/admin-api"

/** `?q=&offset=` of a list; an empty search is left out. */
const listSearchParams = (search: string, offset: number) => ({
  ...(search ? { q: search } : {}),
  offset,
})

export const adminUsersQueryOptions = (search: string, offset: number) =>
  queryOptions({
    queryKey: adminKeys.users(search, offset),
    queryFn: async () =>
      adminUserPageSchema.parse(
        await adminApi.get("users", { searchParams: listSearchParams(search, offset) }).json(),
      ),
    placeholderData: keepPreviousData,
  })

export const adminUserQueryOptions = (id: string) =>
  queryOptions({
    queryKey: adminKeys.user(id),
    queryFn: async () => adminUserDetailSchema.parse(await adminApi.get(`users/${id}`).json()),
  })

export const adminUserEventsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: adminKeys.userEvents(id),
    queryFn: async () =>
      adminUserEventsSchema.parse(await adminApi.get(`users/${id}/events`).json()),
  })

export const adminEventsQueryOptions = (search: string, offset: number) =>
  queryOptions({
    queryKey: adminKeys.events(search, offset),
    queryFn: async () =>
      adminEventPageSchema.parse(
        await adminApi.get("events", { searchParams: listSearchParams(search, offset) }).json(),
      ),
    placeholderData: keepPreviousData,
  })

export const adminEventQueryOptions = (id: string) =>
  queryOptions({
    queryKey: adminKeys.event(id),
    queryFn: async () => adminEventDetailSchema.parse(await adminApi.get(`events/${id}`).json()),
  })

export const adminGroupsQueryOptions = (search: string, offset: number) =>
  queryOptions({
    queryKey: adminKeys.groups(search, offset),
    queryFn: async () =>
      adminGroupPageSchema.parse(
        await adminApi.get("groups", { searchParams: listSearchParams(search, offset) }).json(),
      ),
    placeholderData: keepPreviousData,
  })

export const adminGroupQueryOptions = (id: string) =>
  queryOptions({
    queryKey: adminKeys.group(id),
    queryFn: async () => adminGroupDetailSchema.parse(await adminApi.get(`groups/${id}`).json()),
  })

export const adminGroupRequestsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: adminKeys.groupRequests(id),
    queryFn: async () =>
      z
        .array(adminGroupRequestSchema)
        .parse(await adminApi.get(`groups/${id}/membership-requests`).json()),
  })

export const administratorsQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.administrators(),
    queryFn: async () =>
      z.array(administratorSchema).parse(await adminApi.get("administrators").json()),
  })
